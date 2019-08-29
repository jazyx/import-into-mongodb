const MongoClient = require('mongodb').MongoClient;
const test = require('assert');
// Connection url
const url = 'mongodb://localhost:27017';
// Database Name
const dbName = 'admin';

// Apply sanctions to avoid deprecation warnings
const sanctions = {
   useNewUrlParser: true,
   useUnifiedTopology: true
 }


// Connect using MongoClient
MongoClient.connect(url, sanctions, connectCallback)

function connectCallback(err, client) {
  // Use the admin database for the operation
  const adminDb = client.db(dbName).admin();

  // List all the available databases
  adminDb.listDatabases(listDatabaseCallback)

  function listDatabaseCallback(err, dbs) {
    test.equal(null, err)f;
    test.ok(dbs.databases.length > 0);

    console.log(dbs)

    client.close();
  }
}