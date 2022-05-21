const express = require('express')
const app = express()
const colors = require('colors')
const cors = require('cors')
const userRoutes = require('./routes/userRoutes')


const dotenv = require('dotenv').config()
const connectDB = require('./config/db')
const Message = require('./models/Message')
const User = require('./models/User')
const port = process.env.PORT || 5000 

// These chatroooms are hardcoded
// Make it dynamic
const rooms = ['general', 'tech', 'finance', 'crypto']

// Connect to mongo atlas
connectDB()

app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(cors())


app.use('/users', userRoutes)


const server = require('http').createServer(app)
const io = require('socket.io')(server, {
    cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST']
    }
})

app.get('/rooms', (req, res) => {
    res.json(rooms)
})

// Get last messages from room
async function getLastMessagesFromRoom(room){
    let roomMessages = await Message.aggregate([
        {$match: {to: room}},
        {$group: {_id: '$date', messagesByDate: {$push: '$$ROOT'}}}
    ])
    return roomMessages;
}

// Sort messages by date
function sortRoomMessagesByDate(messages){
    return messages.sort(function(a, b){
        let date1 = a._id.split('/');
        let date2 = b._id.split('/');

        date1 = date1[2] + date1[0] + date1[1];
        date2 = date2[2] + date2[0] + date2[1];

        return date1 < date2 ? -1 : 1
    })
}

// Socket connection
io.on('connection', (socket)=>{
    socket.on('new-user', async() => {
        const members = await User.find();
        io.emit('new-user', members)
    })

    socket.on('join-room', async(room) => {
        socket.join(room);
        let roomMessages = await getLastMessagesFromRoom(room);
        roomMessages = sortRoomMessagesByDate(roomMessages);
        socket.emit('room-messages', roomMessages)
    })
    socket.on('message-room', async(room, content, sender, time, date) => {
        const newMessage = await Message.create({content, from: sender, time, date, to: room});
        let roomMessages = await getLastMessagesFromRoom(room);
        roomMessages = sortRoomMessagesByDate(roomMessages);

        // Sending message to room
        io.to(room).emit('room-messages', roomMessages);

        socket.broadcast.emit('notifications', room)
    })

    app.delete('/logout', async(req, res) => {
        try {
            const {_id, newMessages} = req.body;
            
        } catch (error) {
            
        }
    })
})



server.listen(port, () => {
    console.log(`Server listening on port: ${port}`);
})