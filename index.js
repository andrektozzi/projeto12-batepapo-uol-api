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

    try {
       await db.collection("participants").insertOne({
        name: name,
        lastStatus: Date.now()
       });
       await db.collection("messages").insertOne({
        from: name,
        to: "Todos",
        text: "entra na sala...",
        type:"status",
        time: dayjs().format("HH:mm:ss")
       });
       res.sendStatus(201);
    } catch (error) {
        res.sendStatus(409);
    }
});

app.get("/participants", async (req, res) => {
    try {
        const participants = await db.collection("participants").find({}).toArray();
        res.send(participants);
    } catch (error) {
        res.sendStatus(500);
    }
});

app.post("/messages", (req, res) => {
    const { to, text, type} = req.body;
    const user = req.headers;

    if(!to || !text || !type) return res.sendStatus(422);
    if(type !== 'message' && type !== 'private_message') return res.sendStatus(422);

    const find = db.collection("participants").findOne({name: user});
    find.then(participant => {
        if(!participant) return res.sendStatus(422);
        else {
            const message = db.collection("messages").insertOne({
                from: user,
                to: to,
                text: text,
                type: type,
                time: dayjs().format('HH:MM:SS')
            });
            message.then(() => res.sendStatus(201));
        }
    });
});

app.get("/messages", (req, res) => {
    const { limit } = req.query;
    const { user } = req.headers;

    const promise = db.collection("messages").find({}).toArray();
    promise.then(messages => {
        const limit_messages = messages.filter(value => value.type === "messages" || value.from === user || value.to === user || value.to === "Todos");
        res.send((!limit) ? (limit_messages.reverse()) : (limit_messages.reverse().slice(0, limit)));
    });
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
            message.then(() => res.sendStatus(200));
            db.collection("participants").deleteOne({name: participant.name});
       });
    });
}, 15000);

app.listen(5000);