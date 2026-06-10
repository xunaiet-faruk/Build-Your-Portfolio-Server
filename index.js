const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors');
require('dotenv').config();
const dns = require('dns'); 
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb'); // ObjectId ইম্পোর্ট করা হয়েছে

dns.setServers(['8.8.8.8', '8.8.4.4']);

// Middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASSWORD}@cluster0.ot66xwb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // ডাটাবেজ কানেকশন (উৎপাদন পরিবেশে প্রোডাকশনের সুবিধার্থে সরাসরি টপ-লেভেলে হ্যান্ডেল করা ভালো)
    await client.connect();
    console.log('Successfully connected to MongoDB!');
    
    const portfoliosCollection = client.db('portfolio').collection('projects');

    // ----------------------------------------------------
    // API ১: নতুন পোর্টফোলিও তৈরি করার এন্ডপয়েন্ট (POST)
    // ----------------------------------------------------
    app.post('/api/portfolio/create', async (req, res) => {
      try {
        const portfolioData = req.body;

        // ব্যাকএন্ডে বেসিক ভ্যালিডেশন (নিরাপত্তার জন্য)
        if (!portfolioData.fullName || !portfolioData.title || !portfolioData.email) {
          return res.status(400).json({ 
            success: false, 
            error: 'Missing required fields: Name, Title, and Email are mandatory.' 
          });
        }

        if (!portfolioData.projects || portfolioData.projects.length < 3) {
          return res.status(400).json({ 
            success: false, 
            error: 'Minimum 3 projects are required to build a portfolio.' 
          });
        }

        // ডাটাবেজে ডাটা ইনসার্ট করা
        const result = await portfoliosCollection.insertOne(portfolioData);
        
        // ফ্রন্টএন্ডের রিকোয়ারমেন্ট অনুযায়ী রেসপন্স পাঠানো
        res.status(201).json({
          success: true,
          message: 'Portfolio generated successfully!',
          portfolioId: result.insertedId // MongoDB অটোমেটিক্যালি একটি ইউনিক _id তৈরি করে
        });

      } catch (error) {
        console.error('Error creating portfolio:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
      }
    });

    // ----------------------------------------------------
    // API ২: নির্দিষ্ট পোর্টফোলিওর ডাটা গেট করার এন্ডপয়েন্ট (GET)
    // ----------------------------------------------------
    app.get('/api/portfolio/:id', async (req, res) => {
      try {
        const id = req.params.id;

        // ID ভ্যালিড কি না চেক করা
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ success: false, error: 'Invalid Portfolio ID format' });
        }

        const query = { _id: new ObjectId(id) };
        const portfolio = await portfoliosCollection.findOne(query);

        if (!portfolio) {
          return res.status(404).json({ success: false, error: 'Portfolio not found' });
        }

        res.status(200).json({ success: true, data: portfolio });

      } catch (error) {
        console.error('Error fetching portfolio:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
      }
    });

  } catch (error) {
    console.error('MongoDB Connection Error:', error);
  }
}

run().catch(console.dir);

// Base route
app.get('/', (req, res) => {
  res.send('Portfolio Builder Server Is Running');
});

app.listen(port, () => {
  console.log(`Portfolio is running on port ${port}`);
});