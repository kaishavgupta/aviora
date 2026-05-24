# MongoDB GridFS Setup

The mobile app uploads files to a Node API, and the API stores them in MongoDB GridFS. Do not put `MONGODB_URI` directly in the mobile app.

## Create a Free MongoDB Atlas Cluster

1. Go to MongoDB Atlas and create/sign in to an account.
2. Create a new project.
3. Create a free `M0` cluster.
4. Create a database user with a username and password.
5. Add your current IP address in Network Access.
   - For quick local testing, you can temporarily allow `0.0.0.0/0`.
   - Tighten this before production.
6. Open `Connect` -> `Drivers` and copy the Node.js connection string.
7. Replace `<username>`, `<password>`, and cluster host in `.env`:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/aviora?retryWrites=true&w=majority
```

MongoDB documents note that Atlas free clusters use the `M0` tier, and the official Node driver supports GridFS through `GridFSBucket`.

## Configure Local Environment

For Android/iOS physical device testing, use your computer LAN IP:

```env
EXPO_GRIDFS_API_URL=http://192.168.1.8:4000
GRIDFS_PUBLIC_BASE_URL=http://192.168.1.8:4000
```

Use the same token for app and server during local testing:

```env
EXPO_GRIDFS_API_KEY=change-this-dev-upload-token
GRIDFS_API_KEY=change-this-dev-upload-token
```

## Install Dependencies

```bash
npm install
```

## Start the GridFS API

```bash
npm run gridfs:api
```

Health check:

```text
http://localhost:4000/health
```

## Start Expo

In another terminal:

```bash
npx expo start -c
```

## How Files Are Stored

GridFS creates two MongoDB collections using the bucket name:

```text
request_documents.files
request_documents.chunks
```

The Firestore request stores:

```text
documentUrls: ["http://.../files/<gridfs-file-id>"]
documentPaths: ["<gridfs-file-id>"]
```

When an assistance request is completed/cancelled, the app calls the API to delete those GridFS files and clears file references from Firestore.
