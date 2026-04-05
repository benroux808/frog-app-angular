import { defineAuth } from '@aws-amplify/backend';

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  access: (allow) => [
    allow.resource(createIoTPolicy).to(['iot:Connect', 'iot:Publish', 'iot:Subscribe', 'iot:Receive']),
  ],
});

const createIoTPolicy = {
  name: 'IoTPolicy',
  policyDocument: {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: [
          'iot:Connect',
          'iot:Publish',
          'iot:Subscribe',
          'iot:Receive',
        ],
        Resource: [
          'arn:aws:iot:us-east-2:*:client/*',
          'arn:aws:iot:us-east-2:*:topic/sdk/test/python',
          'arn:aws:iot:us-east-2:*:topic/$aws/things/*',
        ],
      },
    ],
  },
};
