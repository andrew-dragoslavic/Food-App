const { GoogleAuth } = require('google-auth-library');

async function checkAuthentication() {
  console.log('Checking authentication...');
  try {
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    const client = await auth.getClient();
    
    // The 'email' property exists on the client object for a service account.
    const email = client.email;

    if (email) {
      console.log('✅ SUCCESS: Your code is authenticating as:');
      console.log(email);
    } else {
      console.error('❌ FAILURE: Could not determine authenticated email.');
      console.log('The client object is:', client);
    }
  } catch (error) {
    console.error('❌ FAILURE: An error occurred while trying to get credentials.');
    console.error(error.message);
  }
}

checkAuthentication();