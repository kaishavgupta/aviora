/**
 * Creates demo Firebase Auth users and matching Firestore role profiles.
 *
 * Run:
 *   node scripts/createTestUsers.js
 */

require('dotenv').config();

const apiKey = process.env.EXPO_FIREBASE_API_KEY;
const projectId = process.env.EXPO_FIREBASE_PROJECT_ID;

if (!apiKey || !projectId) {
  console.error('Missing EXPO_FIREBASE_API_KEY or EXPO_FIREBASE_PROJECT_ID in .env');
  process.exit(1);
}

const users = [
  {
    email: 'admin@aviora.com',
    password: 'Test@1234',
    name: 'Operations Admin',
    mobile: '9999999999',
    role: 'admin',
  },
  {
    email: 'staff@aviora.com',
    password: 'Test@1234',
    name: 'Support Staff',
    mobile: '8888888888',
    role: 'staff',
  },
  {
    email: 'passenger@aviora.com',
    password: 'Test@1234',
    name: 'Demo Passenger',
    mobile: '7777777777',
    role: 'passenger',
  },
];

const requestJson = async (url, options) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const code = data.error?.message || response.statusText;
      const error = new Error(code);
      error.code = code;
      throw error;
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
};

const signUp = async ({ email, password }) => {
  return requestJson(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    {
      method: 'POST',
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
};

const signIn = async ({ email, password }) => {
  return requestJson(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: 'POST',
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
};

const createOrSignIn = async (user) => {
  try {
    const authData = await signUp(user);
    return { ...authData, created: true };
  } catch (error) {
    if (error.code !== 'EMAIL_EXISTS') {
      throw error;
    }

    const authData = await signIn(user);
    return { ...authData, created: false };
  }
};

const toFirestoreFields = (values) => {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, { stringValue: String(value) }])
  );
};

const patchDocument = async (collection, docId, idToken, fields) => {
  const fieldPaths = Object.keys(fields)
    .map((key) => `updateMask.fieldPaths=${encodeURIComponent(key)}`)
    .join('&');

  return requestJson(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${docId}?${fieldPaths}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        fields,
      }),
    }
  );
};

const seedProfile = async (demoUser, authData) => {
  const profileFields = toFirestoreFields({
    uid: authData.localId,
    name: demoUser.name,
    email: demoUser.email,
    mobile: demoUser.mobile,
    role: demoUser.role,
  });

  await patchDocument('users', authData.localId, authData.idToken, profileFields);

  if (demoUser.role === 'staff') {
    await patchDocument('staff', authData.localId, authData.idToken, {
      ...toFirestoreFields({
        uid: authData.localId,
        name: demoUser.name,
        email: demoUser.email,
        mobile: demoUser.mobile,
      }),
      available: { booleanValue: true },
    });
  }
};

const main = async () => {
  for (const demoUser of users) {
    console.log(`Preparing ${demoUser.role}: ${demoUser.email}`);
    const authData = await createOrSignIn(demoUser);
    await seedProfile(demoUser, authData);
    console.log(`${authData.created ? 'Created' : 'Updated'} ${demoUser.role}: ${demoUser.email}`);
  }

  console.log('\nDemo credentials:');
  console.log('Admin: admin@aviora.com / Test@1234');
  console.log('Staff: staff@aviora.com / Test@1234');
  console.log('Passenger: passenger@aviora.com / Test@1234');
};

main().catch((error) => {
  console.error('Failed to create demo users:', error.message);
  process.exit(1);
});
