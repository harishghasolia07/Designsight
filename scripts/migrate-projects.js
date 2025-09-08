import { MongoClient } from 'mongodb';

async function migrateProjects() {
    const uri = 'mongodb+srv://thisisharish07_db_user:YzfLPNNTdoD2i5Fm@cluster0.ify3iyf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('test'); // Change to your database name if different
        const collection = db.collection('projects');

        // Delete all existing projects (if they're test data)
        console.log('Deleting all existing projects...');
        const deleteResult = await collection.deleteMany({});
        console.log(`Deleted ${deleteResult.deletedCount} projects`);

    } catch (error) {
        console.error('Migration error:', error);
    } finally {
        await client.close();
        console.log('Disconnected from MongoDB');
    }
}

migrateProjects().catch(console.error);
