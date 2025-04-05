import { Client, Account } from 'appwrite'

const client = new Client()
client
  .setEndpoint('https://cloud.appwrite.io/v1') // or your Appwrite instance
  .setProject('nxtai')

  export const account = new Account(client);
  export { ID } from 'appwrite';
  export {OAuthProvider} from 'appwrite';
