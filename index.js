const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();


// middleware 
app.use(cors())
app.use(express.json())

function verifyJwt(req, res, next) {
    const authorize = req.headers.authorization;
    if (!authorize) {
        return res.status(401).send({ message: "Unauthorize access!" })
    }
    const token = authorize.split(" ")[1];
    jwt.verify(token, process.env.SECRET_KEY, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: "Farddin access" })
        }
        req.decoded = decoded;
        next()
    });
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nbflg.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const UserCollection = client.db("ComputerVillage").collection("user");
        const UserProfileCollection = client.db("ComputerVillage").collection("userProfile");
        const partsCollection = client.db("ComputerVillage").collection("parts");
        const orderCollection = client.db("ComputerVillage").collection("orders");
        const reviewCllection = client.db("ComputerVillage").collection("reviews");

        // create user
        app.put('/user/:email', async (req, res) => {
            const user = req.body;
            const email = req.params.email;
            // console.log(user, email);
            const filte = { email: email }
            const options = { upsert: true };
            const updatedDoc = {
                $set: user
            }
            const result = await UserCollection.updateOne(filte, updatedDoc, options);
            const token = jwt.sign({ email: email }, process.env.SECRET_KEY, { expiresIn: '60d' });
            res.send({ result, token })
        })

        // update profile
        app.put('/profile/:email', verifyJwt, async (req, res) => {
            const userProfile = req.body;
            const email = req.params.email;
            console.log(userProfile, email);
            const filter = { email: email }
            const options = { upsert: true };
            const updatedDoc = {
                $set: userProfile
            }
            const result = await UserProfileCollection.updateOne(filter, updatedDoc, options);
            res.send(result)
        })
        // get profile
        app.get('/profile/:email',verifyJwt, async (req, res) => {
            const email = req.params.email;
            const fiter = { email: email };
            const result = await UserProfileCollection.findOne(fiter)
            res.send(result)
        })

        // get all parts 
        app.get('/parts', async (req, res) => {
            const query = {};
            const result = await partsCollection.find(query).toArray();
            res.send(result)
        })

        // get sigle parts 
        app.get('/part/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await partsCollection.findOne(filter)
            res.send(result)
        })

        // post orders 
        app.post('/orders', async (req, res) => {
            const orderInfo = req.body;
            const result = await orderCollection.insertOne(orderInfo)
            res.send(result)
        })

        // get all orders
        app.get('/orders', verifyJwt, async (req, res) => {
            const quary = {};
            const result = await orderCollection.find(quary).toArray()
            res.send(result)
        })

        // get my order
        app.get('/orders/:email', verifyJwt, async (req, res) => {
            const email = req.params.email;
            const fiter = { customerEmail: email };
            const result = await orderCollection.find(fiter).toArray()
            res.send(result)
        })

        // delete order
        app.delete('/order/:id', verifyJwt, async (req, res) => {
            const id = req.params.id;
            const fiter = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(fiter);
            res.send(result)
        })

        // get all review 
        app.get('/reviews', async (req, res) => {
            const quary = {};
            const result = await reviewCllection.find(quary).toArray()
            res.send(result)
        })

        // post reviews 
        app.post('/reviews', verifyJwt, async (req, res) => {
            const review = req.body;
            console.log(review);
            const result = await reviewCllection.insertOne(review)
            res.send(result)
        })


    } finally {

    }
}
run().catch(console.dir)





app.get('/', (req, res) => res.send('Welcome to Computer Village'))
app.listen(port, () => console.log('Port is', port))