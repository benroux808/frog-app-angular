import { Injectable } from '@angular/core';
import { PubSub } from '@aws-amplify/pubsub/iot';
import outputs from '../../amplify_outputs.json';

@Injectable({
  providedIn: 'root',
})
export class IotService {
  private readonly mqttTopic = 'sdk/test/python';
  private readonly awsRegion = this.getRegion();
  private readonly awsIoTEndpoint = this.getIoTEndpoint();
  private readonly client = new PubSub({
    region: this.awsRegion,
    endpoint: this.awsIoTEndpoint,
  });

  private getRegion(): string {
    const outputsAny = outputs as any;
    return outputsAny.aws_pubsub_region ||
           outputsAny.aws_project_region ||
           outputsAny.auth?.aws_region ||
           'us-east-2';
  }

  private getIoTEndpoint(): string {
    const outputsAny = outputs as any;
    if (outputsAny.aws_iot_endpoint) {
      return outputsAny.aws_iot_endpoint;
    }
    const region = this.getRegion();
    return `wss://${region}.iot.amazonaws.com/mqtt`;
  }

  async sendCommand(command: string): Promise<void> {
    console.log('IoT Service - Attempting to send command:', command);
    console.log('IoT Service - Region:', this.awsRegion);
    console.log('IoT Service - Endpoint:', this.awsIoTEndpoint);
    console.log('IoT Service - Topic:', this.mqttTopic);

    const message = {
      action: command,
      source: 'amplify-angular-template',
      sentAt: new Date().toISOString(),
    };

    console.log('IoT Service - Message:', message);

    try {
      await this.client.publish({
        topics: [this.mqttTopic],
        message,
      });
      console.log('IoT Service - Command sent successfully');
    } catch (error) {
      console.error('IoT Service - Failed to send command:', error);
      throw error;
    }
  }
}
