import { Injectable } from '@angular/core';
import { PubSub } from '@aws-amplify/pubsub/iot';
import outputs from '../../amplify_outputs.json';

@Injectable({
  providedIn: 'root',
})
export class IotService {
  private readonly mqttTopic = 'sdk/test/python';
  private readonly awsRegion = outputs.aws_pubsub_region || outputs.aws_project_region;
  private readonly awsIoTEndpoint = outputs.aws_iot_endpoint;
  private readonly client = new PubSub({
    region: this.awsRegion,
    endpoint: this.awsIoTEndpoint,
  });

  async sendCommand(command: string): Promise<void> {
    const message = {
      action: command,
      source: 'amplify-angular-template',
      sentAt: new Date().toISOString(),
    };

    await this.client.publish({
      topics: [this.mqttTopic],
      message,
    });
  }
}
