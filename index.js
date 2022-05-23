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
        return res.status(401).send({message: "Unauthorize access!"})
    }
    const token = authorize.split(" ")[1];
    jwt.verify(token, process.env.SECRET_KEY, function (err, decoded) {
        if (err) {
            return res.status(403).send({message:"Farddin access"})
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
        const partsCollection = client.db("ComputerVillage").collection("parts");
        const orderCollection = client.db("ComputerVillage").collection("orders");


        app.put('/user/:email', async (req, res) => {
            const user = req.body;
            const email = req.params.email;
            console.log(user, email);
            const filte = { email: email }
            const options = { upsert: true };
            const updatedDoc = {
                $set: user
            }

            const result = await UserCollection.updateOne(filte, updatedDoc, options);
            const token = jwt.sign({ email: email }, process.env.SECRET_KEY, { expiresIn: '60d' });
            res.send({ result, token })
        })

        // get all parts 
        app.get('/parts', async (req, res)=>{
            const query = {};
            const result = await partsCollection.find(query).toArray();
            res.send(result)
        })

        // get sigle parts 
        app.get('/part/:id', async (req, res)=>{
            const id = req.params.id;
            const filter = {_id: ObjectId(id)};
            const result = await partsCollection.findOne(filter)
            res.send(result)
        })

        // post orders 
        app.post('/orders', async (req, res)=>{
            const orderInfo = req.body;
            const result = await orderCollection.insertOne(orderInfo)
            res.send(result)
        })


    } finally {

    }
}
run().catch(console.dir)





app.get('/', (req, res) => res.send('Welcome to Computer Village'))
app.listen(port, () => console.log('Port is', port))