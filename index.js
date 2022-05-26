const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');



// middleware 
app.use(cors())
app.use(express.json())

function verifyJwt(req, res, next) {
    const authorize = req.headers.authorization;
    if (!authorize) {
        return res.status(401).send({ message: "Unauthorize access!" })
    }
    // console.log(authorize);
    const token = authorize.split(" ")[1];
    jwt.verify(token, process.env.SECRET_KEY, function (err, decoded) {
        if (err) {
            // console.log("err");
            return res.status(403).send({ message: "Forbidden access" })
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

        async function verfyAdmin(req, res, next) {
            const requisterEmail = req.decoded.email;
            const requister = await UserCollection.findOne({ email: requisterEmail })
            if (requister.roll === "admin") {
                next()
            }
            else {
                res.status(403).send({ message: 'forbidden' })
            }
        }

        // create payment 
        app.post("/create-payment-intent", verifyJwt, async (req, res) => {
            const { price } = req.body;
            const amount = price*100;

            // Create a PaymentIntent with the order amount and currency
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types:['card']
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

        // create user
        app.put('/user/:email',  async (req, res) => {
            const user = req.body;
            const email = req.params.email;
            const filte = { email: email }
            const options = { upsert: true };
            const updatedDoc = {
                $set: user
            }
            const result = await UserCollection.updateOne(filte, updatedDoc, options);
            const token = jwt.sign({ email: email }, process.env.SECRET_KEY, { expiresIn: '60d' });
            res.send({ result, token })
        })

        // get all users
        app.get('/users', verifyJwt, async (req, res) => {
            const query = {};
            const result = await UserCollection.find(query).toArray();
            res.send(result)
        })


        // get admin 
        app.get('/admin/:email', verifyJwt, async (req, res) => {
            const userEmail = req.params.email;
            const user = await UserCollection.findOne({ email: userEmail })
            const isAdmin = user.roll === 'admin';
            res.send({ admin: isAdmin })
        })

        // make admin
        app.put("/user/makeAdmin/:email", verifyJwt, verfyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { roll: 'admin' }
            };
            const result = await UserCollection.updateOne(filter, updateDoc);
            res.send(result)
        })
        // delete admin
        app.put("/user/deleteAdmin/:email", verifyJwt, verfyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: { roll: '' }
            };
            const result = await UserCollection.updateOne(filter, updateDoc, options);
            res.send(result)
        })



        // update profile
        app.put('/profile/:email', verifyJwt, async (req, res) => {
            const userProfile = req.body;
            const email = req.params.email;
            // console.log(userProfile, email);
            const filter = { email: email }
            const options = { upsert: true };
            const updatedDoc = {
                $set: userProfile
            }
            const result = await UserProfileCollection.updateOne(filter, updatedDoc, options);
            res.send(result)
        })
        // get profile
        app.get('/profile/:email', verifyJwt, async (req, res) => {
            const email = req.params.email;
            // console.log(email);
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
        app.get('/part/:id', verifyJwt, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await partsCollection.findOne(filter)
            res.send(result)
        })

        // post part 
        app.post('/part', verifyJwt, async (req, res) => {
            const part = req.body;
            const result = await partsCollection.insertOne(part)
            if (result.insertedId) {
                res.send({ success: true, message: `Successfuly Added ${part.name}` })
            }
            else {
                res.send({ success: false, message: `Somthing is Wrong` })
            }

        })

        // delete parts
        app.delete('/part/:id', verifyJwt, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await partsCollection.deleteOne(filter);
            res.send(result)
        })



        // post orders 
        app.post('/orders', verifyJwt, async (req, res) => {
            const orderInfo = req.body;
            const result = await orderCollection.insertOne(orderInfo)
            res.send(result)
        })

        // make payment order
        app.patch('/order/:id', verifyJwt, async(req, res)=>{
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    paid : true,
                    transectionId : payment.transectionId
                }
            }
            const result = await orderCollection.updateOne(filter, updatedDoc);
            res.send(result)
        })

        // ship order 
        app.put("/orderShip/:id", verifyJwt, verfyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: { shipped: true }
            };
            const result = await orderCollection.updateOne(filter, updateDoc);
            res.send(result)
        })

        // get all orders
        app.get('/orders', verifyJwt, async(req, res) => {
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


        // get sigle order 
        app.get('/order/:id', verifyJwt, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await orderCollection.findOne(filter)
            res.send(result)
        })

        // delete order
        app.delete('/order/:id', verifyJwt, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(filter);
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
            // console.log(review);
            const result = await reviewCllection.insertOne(review)
            res.send(result)
        })


    } finally {

    }
}
run().catch(console.dir)





app.get('/', (req, res) => res.send('Welcome to Computer Village'))
app.listen(port, () => console.log('Port is', port))