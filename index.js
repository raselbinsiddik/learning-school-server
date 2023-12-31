const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

// middlewere
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fy2r3q4.mongodb.net/?retryWrites=true&w=majority`;

const dbConnect = async () => {
    try {
        client.connect();
        console.log("Database Connected Successfully✅");

    } catch (error) {
        console.log(error.name, error.message);
    }
}
dbConnect()

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    console.log(authorization);
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access 4044 go' });
    }
    //bearer otken
    const token = authorization.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
    })
}



const classCollection = client.db("languageDb").collection("studentClass");
const instructorCollection = client.db("languageDb").collection("instructor");
const studentsCollection = client.db("languageDb").collection("booked");
const usersCollection = client.db("languageDb").collection("users");
const addClassCollection = client.db("languageDb").collection("addClass");
const paymentCollection = client.db("languageDb").collection("payment");
app.get('/', (req, res) => {
    res.send('class is start now')
});


app.post('/jwt', async (req, res) => {
    const user = req.body;
    const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
    res.send({ token });
})

const verifyAdmin = async (req, res, next) => {
    const email = req.decoded.email;
    const query = { email: email };
    const user = await usersCollection.findOne(query);
    if (user?.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden message' });
    }
    next();
}

app.get('/studentClass', async (req, res) => {
    const result = await classCollection.find().toArray();
    res.send(result);
});

app.get('/instructor', async (req, res) => {
    const result = await instructorCollection.find().toArray();
    res.send(result);
});

app.get('/booked', verifyJWT, async (req, res) => {
    const email = req.query.email;
    console.log(email)
    if (!email) {
        res.send([]);
    }
    const decodedEmail = req.decoded.email;
    if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'porbidden  access' })
    }
    const query = { email: email };
    const result = await studentsCollection.find(query).toArray();
    res.send(result);
});


app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
    const result = await usersCollection.find().toArray();
    res.send(result);
});

app.post('/booked', async (req, res) => {
    const booked = req.body;
    const result = await studentsCollection.insertOne(booked);
    res.send(result);
});

app.post('/users', async (req, res) => {
    const user = req.body;
    const query = { email: user.email }
    const existingUser = await usersCollection.findOne(query);
    if (existingUser) {
        return res.send({ message: 'user already exists' })
    };
    const result = await usersCollection.insertOne(user);
    res.send(result);
});

app.post('/addClass', async (req, res) => {
    const addclass = req.body;
    console.log(addclass);
    const result = await addClassCollection.insertOne(addclass);
    res.send(result);
});
app.get('/addClass', async (req, res) => {
    console.log(req.query.email);
    let query = {};
    if (req.query?.email) {
        query = { email: req.query.email };
    }

    const result = await addClassCollection.find(query).toArray();
    res.send(result);
});


app.get('/users/admin/:email', async (req, res) => {
    const email = req.params.email;
    console.log(email);
    // if (req.decoded.email !== email) {
    //     res.send({ admin: false })
    // }
    const query = { email: email };
    const user = await usersCollection.findOne(query);
    const result = { admin: user?.role === 'admin' };
    res.send(result);
});

app.get('/users/instructor/:email', async (req, res) => {
    const email = req.params.email;
    console.log({ email });

    const query = { email: email };
    const user = await usersCollection.findOne(query);
    console.log({ user });
    const result = { instructor: user?.role === 'instructor' };
    res.send(result);
});

app.patch('/users/admin/:id', async (req, res) => {
    const id = req.params.id;
    console.log(id);
    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
        $set: {
            role: 'admin'
        },
    };
    const result = await usersCollection.updateOne(filter, updateDoc);
    res.send(result);
});


app.patch('/users/instructor/:id',verifyJWT, async (req, res) => {
    const id = req.params.id;
    console.log(id);
    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
        $set: {
            role: 'instructor'
        },
    };
    const result = await usersCollection.updateOne(filter, updateDoc);
    res.send(result);
})


app.delete('/booked/:id', async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await studentsCollection.deleteOne(query);
    res.send(result);
});

app.delete('/users/admin/:id', async (req, res) => {
    const id = req.params.id;
    console.log(id);
    const query = { _id: new ObjectId(id) };
    const result = await usersCollection.deleteOne(query);
    res.send(result);
});

app.post('/create-payment-intent', verifyJWT, async (req, res) => {
    const { price } = req.body;
    console.log(price);
    const amount = parseInt(price * 100);
    const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
    });
    res.send({
        clientSecret: paymentIntent.client_secret
    })
});

app.post('/payment', verifyJWT, async (req, res) => {
    const payment = req.body;
    console.log(payment);
    const insetResult = await paymentCollection.insertOne(payment);

    const query = { _id: new ObjectId(payment.ItemsId) };
    const deleteResult = await studentsCollection.deleteOne(query);
    res.send({ insetResult, deleteResult });
});

app.get('/payment', async (req, res) => {
    console.log(req.query.email);
    let query = {};
    if (req.query?.email) {
        query = { email: req.query.email };
    }

    const result = await paymentCollection.find(query).toArray();
    res.send(result);
})


app.listen(port, () => {
    console.log(`huury up on port ${port}`);
})