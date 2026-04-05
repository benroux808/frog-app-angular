import { Injectable } from '@angular/core';
import { fetchAuthSession } from 'aws-amplify/auth';
import mqtt from 'mqtt';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-js';
import outputs from '../../amplify_outputs.json';

@Injectable({
  providedIn: 'root',
})
export class IotService {
  private readonly mqttTopic = 'sdk/test/python';
  private client: any = null;
  private isConnected = false;

  private getRegion(): string {
    const outputsAny = outputs as any;
    return outputsAny.aws_pubsub_region ||
           outputsAny.aws_project_region ||
           'us-east-2';
  }

  private getIoTEndpoint(): string {
    const outputsAny = outputs as any;
    if (outputsAny.aws_iot_endpoint) {
      // Extract domain from wss:// URL
      const url = new URL(outputsAny.aws_iot_endpoint);
      return url.hostname;
    }
    const region = this.getRegion();
    return `${region}.iot.amazonaws.com`;
  }

  private async createSignedUrl(): Promise<string> {
    const session = await fetchAuthSession();
    if (!session.credentials) {
      throw new Error('No AWS credentials available');
    }

    const region = this.getRegion();
    const endpoint = this.getIoTEndpoint();

    const signer = new SignatureV4({
      service: 'iotdevicegateway',
      region: region,
      credentials: {
        accessKeyId: session.credentials.accessKeyId,
        secretAccessKey: session.credentials.secretAccessKey,
        sessionToken: session.credentials.sessionToken,
      },
      sha256: Sha256,
    });

    const request = {
      method: 'GET',
      protocol: 'wss',
      hostname: endpoint,
      path: '/mqtt',
      headers: {},
    };

    const signedRequest = await signer.sign(request);

    const queryParams = new URLSearchParams();
    if (signedRequest.headers?.['Authorization']) {
      queryParams.set('Authorization', signedRequest.headers['Authorization']);
    }
    if (signedRequest.headers?.['X-Amz-Date']) {
      queryParams.set('X-Amz-Date', signedRequest.headers['X-Amz-Date']);
    }
    if (session.credentials.sessionToken) {
      queryParams.set('X-Amz-Security-Token', session.credentials.sessionToken);
    }

    return `wss://${endpoint}/mqtt?${queryParams.toString()}`;
  }

  private async createClient(): Promise<any> {
    if (this.client && this.isConnected) {
      return this.client;
    }

    const signedUrl = await this.createSignedUrl();
    console.log('IoT Service - Connecting to signed URL');

    this.client = mqtt.connect(signedUrl, {
      clientId: `amplify-angular-${Date.now()}`,
      clean: true,
      reconnectPeriod: 0,
    });

    return new Promise((resolve, reject) => {
      this.client.on('connect', () => {
        console.log('IoT Service - MQTT connected');
        this.isConnected = true;
        resolve(this.client);
      });

      this.client.on('error', (error: any) => {
        console.error('IoT Service - MQTT connection error:', error);
        reject(error);
      });

      this.client.on('offline', () => {
        console.log('IoT Service - MQTT offline');
        this.isConnected = false;
      });

      this.client.on('message', (topic: string, payload: Buffer) => {
        console.log('IoT Service - Received message on topic:', topic, payload.toString());
      });
    });
  }

  async sendCommand(command: string): Promise<void> {
    console.log('IoT Service - Attempting to send command:', command);
    console.log('IoT Service - Topic:', this.mqttTopic);

    // Check if we have valid credentials
    try {
      const session = await fetchAuthSession();
      console.log('IoT Service - Auth session available:', !!session);
      if (session.credentials) {
        console.log('IoT Service - Credentials available');
      } else {
        console.error('IoT Service - No credentials available');
        throw new Error('No AWS credentials available');
      }
    } catch (authError) {
      console.error('IoT Service - Auth session error:', authError);
      throw authError;
    }

    const message = {
      action: command,
      source: 'amplify-angular-template',
      sentAt: new Date().toISOString(),
    };

    console.log('IoT Service - Message:', message);

    try {
      const client = await this.createClient();
      console.log('IoT Service - Publishing to topic:', this.mqttTopic);
      client.publish(this.mqttTopic, JSON.stringify(message), { qos: 0 }, (error?: any) => {
        if (error) {
          console.error('IoT Service - Publish error:', error);
          throw error;
        } else {
          console.log('IoT Service - Command sent successfully');
        }
      });
    } catch (publishError) {
      console.error('IoT Service - Publish failed:', publishError);
      throw publishError;
    }
  }
}
