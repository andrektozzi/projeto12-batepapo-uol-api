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
    const { to, text, type } = req.body;
    const from = req.header("user");
  
    const validation = messageSchema.validate(req.body, {abortEarly: false});
  
    if (validation.error) {
      return res.sendStatus(422);
    }
  
    try {
      const activeParticipant = await db.collection("participants").findOne({ name: from });
  
      if (!activeParticipant) {
        return res.sendStatus(422);
      }
  
      await db.collection("messages").insertOne({
        from,
        to,
        text,
        type,
        time: dayjs().format("HH:mm:ss"),
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
  
        if(to === user || from === user || to === "Todos"){
            return true;
        } else if(type === "status" || type === "message"){
            return true;
        }
      });
  
      if (limit) {
        const limitedMessages = filterMessages.slice(-limit);
        return res.send(limitedMessages);
      }
  
      res.send(filterMessages);
    } catch (error) {
      res.sendStatus(500);
    }
  });

app.post("/status", async (req, res) => {
    const name = req.header("user");    

    try {
        const activeParticipant = await db.collection("participants").findOne({ name: name});

        if(!activeParticipant){
            return res.sendStatus(404);
        }

        await db.collection("users").updateOne({ name: name}, { $set: { lastStatus: Date.now() }});
        res.sendStatus(200);
    } catch (error) {
        res.sendStatus(500);
    }
});

setInterval(async () => {
    
    try {
        const time = Date.now();
        const participants = await db.collection("participants").find({}).toArray();

        participants.map( async (participant) => {
            const { name, lastStatus } = participant;

            if(time - lastStatus > 10000){
                await db.collection("participants").deleteOne({ name });
                await db.collection("messages").insertOne({
                    from: name,
                    to: "Todos",
                    text: "sai da sala...",
                    type: "status",
                    time: dayjs().format("HH:mm:ss")
                });
                return console.log("Usuário inativo");
            }
        });
    } catch (error) {
        console.log("Erro ao deletar o usuário");
    }
}, 15000);

app.listen(5000);