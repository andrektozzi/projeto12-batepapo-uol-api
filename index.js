import express, { json } from 'express';
import cors from 'cors';
import dayjs from 'dayjs';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import joi from 'joi';

const app = express();
app.use(express.json());
app.use(cors());

dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient.connect().then(() => {
    db = mongoClient.db("bate-papo-uol");
})

const participantSchema = joi.object({
    name: joi.string().required()
});

const messageSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid("message", "private_message").required()
});

app.post("/participants", async (req, res) => {
    const { name } = req.body;  
    const validation = participantSchema.validate({ name });
  
    if (validation.error) {
      return res.sendStatus(422);
    }
  
    try {
      const activeParticipant = await db.collection("participants").findOne({ name: name });
  
      if (activeParticipant) {
        return res.sendStatus(409);
      }
  
      await db.collection("participants").insertOne({
        name: name,
        lastStatus: Date.now(),
      });
  
      await db.collection("messages").insertOne({
        from: name,
        to: "Todos",
        text: "entra na sala...",
        type: "status",
        time: dayjs().format("HH:mm:ss"),
      });  
      res.sendStatus(201);
    } catch (error) {
      res.sendStatus(500);
    }
  });
  
  app.get("/participants", async (_, res) => {
    try {
      const users = await db.collection("participants").find({}).toArray();
      res.send(users);
    } catch (error) {
      res.sendStatus(500);
    }
  });

app.post("/messages", async (req, res) => {
    const { to, text, type} = req.body;
    const from = req.header("user");
    const validation = messageSchema.validate(req.body, {abortEarly: false});

    if(validation.error){
        return res.sendStatus(422);
    }

   try {
    const activeParticipant = await db.collection("participants").findOne({ name: from });
    if (!activeParticipant){
        res.sendStatus(422);
    }

    await db.collection("messages").insertOne({
        from,
        to,
        text,
        type,
        time: dayjs().format("HH:mm:ss")
    });
    res.sendStatus(201);
   } catch (error) {
    res.sendStatus(500);
   }
});

app.get("/messages", async (req, res) => {
    const limit = parseInt(req.query.limit);
    const user = req.header("user");

    try {
        const messages = await db.collection("messages").find({}).toArray();
        const filterMessages = messages.filter((message) => {
            const { from, to, type } = message;
            if(to === "Todos" || to === user || from === user){
                return true;
            } else if(type === "message" || type === "status"){
                return true;
            }
        });
        
        if(limit){
            const limitMessages = filterMessages.slice(-limit);
            return res.send(limitMessages);
        }
        res.send(filterMessages);
    } catch (error) {
        res.sendStatus(500);
    }
});

app.post("/status", (req, res) => {
    const { user } = req.header;    

    const find = db.collection("participants").findOne({name: user});
    find.then(participant => {
        if(!participant) return res.sendStatus(404);
        else{
            const status = db.collection("participants").updateOne({name: user}, {$set: {lastStatus: Date.now()}});
            status.then(() => res.sendStatus(200));
        }
    });
});

setInterval(() => {
    const time = Date.now();
    const promise = db.collection("participants").find({}).toArray();
    promise.then(participants => {
        const inactive = participants.filter((participant) => (time - participant.lastStatus) > 10000);
        inactive.forEach((participant) => {
            const message = db.collection("messages").insertOne({
                from: participant.name,
                to: 'Todos',
                text: 'sai da sala...',
                type: 'status',
                time: dayjs().format('HH:MM:SS')
            });
            //message.then(() => res.sendStatus(200));
            db.collection("participants").deleteOne({name: participant.name});
       });
    });
}, 15000);

app.listen(5000);