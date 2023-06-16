const express = require("express");
const app = express();
require("dotenv").config();
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY);
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const port = process.env.POST || 5000;

// MIDDLEWARE
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  console.log(authorization);
  if (!authorization) {
    return res.status(401).send({ message: "unauthorize access" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorize access" });
    }
    req.decoded = decoded;
  });
  next();
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fudiykq.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const classCollection = client
      .db("summerCamp")
      .collection("classCollections");
    const userCollection = client.db("summerCamp").collection("userCollection");
    const selectCollection = client
      .db("summerCamp")
      .collection("selectCollection");
    const feadbackCollection = client
      .db("summerCamp")
      .collection("feadbackCollection");
    const paymentCollection = client
      .db("summerCamp")
      .collection("paymentCollection");
    const tipsCollection = client
      .db("summerCamp")
      .collection("tipsCollection");

    // jwt

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const expiresInMonths = 2;
      const expiresInDays = expiresInMonths * 30; 
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: `${expiresInDays}d`
      });
      res.send({ token });
    });


    
    const verifyAdmin =async(req, res, next)=>{
      const email = req.decoded.email
      const query = {email : email}
      const user = await userCollection.findOne(query)
      if(user?.role !== 'admin'){
        return res.status(403).send({error : true, message : 'forbidden access'})
      }
      next();
    
    }
    const verifyInstructor =async(req, res, next)=>{
      const email = req.decoded.email
      const query = {email : email}
      const user = await userCollection.findOne(query)
      if(user?.role !== 'instructor'){
        return res.status(403).send({error : true, message : 'forbidden access'})
      }
      next();
    
    }


    // users
    app.get("/user", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existing = await userCollection.findOne(query);
      if (existing) {
        return res.send({ message: "already insert" });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });


// secure admin
    app.get('/users/admin/:email', verifyJWT, async(req, res)=>{
      const email = req.params.email
      if(req.decoded.email !== email){
        return res.send({admin : false})
      }
      const query = {email : email}
      const user = await userCollection.findOne(query)
      const result = {admin : user?.role === 'admin'}
      res.send(result)
    })
// secure instructor
    app.get('/users/instructor/:email', verifyJWT, async(req, res)=>{
      const email = req.params.email
      if(req.decoded.email !== email){
        return res.send({admin : false})
      }
      const query = {email : email}
      const user = await userCollection.findOne(query)
      const result = {admin : user?.role === 'instructor'}
      res.send(result)
    })

    // tips data get

    app.get('/tips', async(req, res)=>{
      const result = await tipsCollection.find().toArray()
      res.send(result)
    })

    // class collection
    app.get("/allClasses", async (req, res) => {
      const result = await classCollection.find().toArray();
      if (!result) {
        res.status(401).send({ error: true, message: "not found" });
      }
      res.send(result);
    });

    // approve class
    app.get("/classes", async (req, res) => {
      const query = { status: "approved" };
      const result = await classCollection.find(query).toArray();
      if (!result) {
        res.status(401).send({ error: true, message: "not found" });
      }
      res.send(result);
    });

    // popular class
    app.get("/polularClass", async (req, res) => {
      const result = await classCollection
        .find()
        .sort({ enrolled: -1 })
        .limit(6)
        .toArray();
      if (!result) {
        return res.send({ message: "data not found" });
      }
      res.send(result);
    });

    // add a class
    app.post("/addClass", verifyJWT,verifyInstructor, async (req, res) => {
      const data = req.body;
      if (!data) {
        return res.send({ message: "data not found" });
      }
      const result = await classCollection.insertOne(data);
      res.send(result);
    });

    //  instructor

    app.get("/instructor", async (req, res) => {
      const query = { role: "instructor" };
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });

    // popular intructor

    app.get("/popularInstructor", async (req, res) => {
      const query = { role: "instructor" };
      const result = await userCollection.find(query).limit(6).toArray();
      res.send(result);
    });

    // select Collection
    app.get("/select/:email", verifyJWT, async (req, res) => {
      const query = { studentEmail: req.params.email };
      const result = await selectCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/select/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      if(!id || !data){
        return res.status(401).send({message : 'not found'})
      }
      const query = { _id: new ObjectId(id) };
      const email = { email: data?.studentEmail };

      const existing = await selectCollection.findOne(query);
      if (existing?.studentEmail === email?.email) {
        return res.send({ message: "already select this course!" });
      } else {
        const findElement = await classCollection.findOne(query);
        findElement
        .studentEmail = data.studentEmail;
        delete findElement._id
        const result = await selectCollection.insertOne(findElement)
        const newId = { _id: new ObjectId(result?._id) };
        if(result){
        res.send(result)
       }
      }
    });

    app.delete("/selectItemDelete/:id", verifyJWT,  async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await selectCollection.deleteOne(query);
      res.send(result);
    });


    // update user role
// make instructor
    app.patch(`/makeInstructor/:id`,  verifyJWT, verifyAdmin, async(req, res)=>{
      const id = req.params.id 
      const filter = {_id : new ObjectId(id)}
      const updateDoc = {
        $set: {
          role: 'instructor'
        },
      };

      const result = await userCollection.updateOne(filter, updateDoc)
      res.send(result)
    })
// make admin
    app.patch(`/makeAdmin/:id`, verifyJWT, verifyAdmin, async(req, res)=>{
      const id = req.params.id 
      const filter = {_id : new ObjectId(id)}
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };

      const result = await userCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    // manage classes

    app.patch('/approved/:id', verifyJWT, verifyAdmin, async(req, res)=>{
      const id = req.params.id 
      const filter = {_id : new ObjectId(id)}
      const updateDoc = {
        $set: {
          status: 'approved'
        },
      };

      const result = await classCollection.updateOne(filter, updateDoc)
      res.send(result)
    })
    app.patch('/denied/:id', verifyJWT, verifyAdmin, async(req, res)=>{
      const id = req.params.id 
      const filter = {_id : new ObjectId(id)}
      const updateDoc = {
        $set: {
          status: 'denied'
        },
      };


      // create payment 
      app.post('/create-payment-intent', async(req, res)=>{
        const {price} = req.body 
        const ammount = price*100
        const paymentIntent = await stripe.paymentIntents.create({
          ammount : ammount, 
          currency : 'usd',
          payment_method_types : ['card']
        });
        res.send({
          clientSecret : paymentIntent.client.secret
        })

      })

      const result = await classCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    // feadback collection

    app.post('/feadbackCollection', async(req, res)=>{
      const data = req.body
      const result = await feadbackCollection.insertOne(data)
      res.send(result)
    })

    // payment

    app.post('/payment', async(req, res)=>{
      const payment = req.body
      console.log(payment);
      const result = await paymentCollection.insertOne(payment)
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("summer camp is running");
});

app.listen(port, () => {
  console.log(`summer camp is runnig on port : ${port}`);
});
