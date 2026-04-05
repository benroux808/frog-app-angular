import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TodosComponent } from './todos/todos.component';
import { AuthComponent } from './auth.component';
import { Amplify } from 'aws-amplify';
import outputs from '../../amplify_outputs.json';

const amplifyConfig = {
  ...outputs,
  aws_cognito_identity_pool_id: 'us-east-2:99d5561c-c371-4c61-a06a-1d46ea5c7557',
  PubSub: {
    region: outputs.aws_pubsub_region,   // ✅ already in your outputs
    endpoint: outputs.aws_iot_endpoint   // ✅ already in your outputs
  }
};

Amplify.configure(amplifyConfig);

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  imports: [RouterOutlet, TodosComponent, AuthComponent],
})
export class AppComponent {
  title = 'amplify-angular-template';
}
