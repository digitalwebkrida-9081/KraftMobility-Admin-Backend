const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const MONGO_URI = 'mongodb://admin:Qwerty%23786@15.235.224.91:27017/kraftmobility?authSource=admin';

async function migrate() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // 1. Update Users
    console.log('Updating users...');
    const userResult = await db.collection('users').updateMany(
      { role: 'Operator' },
      { $set: { role: 'Field Executive' } }
    );
    console.log(`Updated ${userResult.modifiedCount} users.`);

    // 2. Update Permissions
    console.log('Updating permissions...');
    const permResult = await db.collection('permissions').updateMany(
      { role: 'Operator' },
      { $set: { role: 'Field Executive' } }
    );
    console.log(`Updated ${permResult.modifiedCount} permissions.`);

    // 3. Update Notifications
    console.log('Updating notifications...');
    const notifyResult = await db.collection('notifications').updateMany(
      { role: 'Operator' },
      { $set: { role: 'Field Executive' } }
    );
    console.log(`Updated ${notifyResult.modifiedCount} notifications.`);

    // 4. Update Cases
    console.log('Updating cases...');
    // Rename field assignedOperator to assignedFieldExecutive
    // Update documents.uploadedByRole
    const caseResult = await db.collection('cases').updateMany(
      {},
      [
        {
          $set: {
            assignedFieldExecutive: { $ifNull: ['$assignedFieldExecutive', '$assignedOperator'] },
            documents: {
              $map: {
                input: { $ifNull: ['$documents', []] },
                as: 'doc',
                in: {
                  $mergeObjects: [
                    '$$doc',
                    {
                      uploadedByRole: {
                        $cond: {
                          if: { $eq: ['$$doc.uploadedByRole', 'Operator'] },
                          then: 'Field Executive',
                          else: '$$doc.uploadedByRole'
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        },
        { $unset: 'assignedOperator' }
      ]
    );
    console.log(`Updated ${caseResult.modifiedCount} cases.`);

    // 5. Update Tickets
    console.log('Updating tickets...');
    // Update notes author
    const ticketResult = await db.collection('tickets').updateMany(
      { 'notes.author': 'Operator' },
      { $set: { 'notes.$[elem].author': 'Field Executive' } },
      { arrayFilters: [{ 'elem.author': 'Operator' }] }
    );
    console.log(`Updated ${ticketResult.modifiedCount} tickets.`);

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
