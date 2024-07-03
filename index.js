const socketIO = require("socket.io");
const http = require("http");
const express = require("express");
const cors = require("cors");
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

require("dotenv").config({
  path: "./.env",
});

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

let users = [];


const addUser = (userId, socketId) => {
  !users.some((user) => user.userId === userId) &&
    users.push({ userId, socketId });
};


const removeUser = (socketId) => {
  users = users.filter((user) => user.socketId !== socketId);
};

const getUSer = (recieverId) => {
  return users.find((user) => user.userId === recieverId);
};

//  message object with a seen property
const createMessage = ({ senderId, recieverId, text, images }) => ({
  senderId,
  recieverId,
  text,
  images,
  seen: false,
});

io.on("connection", (socket) => {
  console.log(`a user is connected`);

  // take userId and socketId from user
  socket.on("addUser", (userId) => {
    addUser(userId, socket.id);
    io.emit("getUsers", users);
  });

  // send and get message
  const messages = {}; // to track msg send to each other

  socket.on("sendMessage", ({ senderId, recieverId, text, images }) => {
    const message = createMessage({ senderId, recieverId, text, images });

    const user = getUSer(recieverId);

    // store the msg

    if (!messages[recieverId]) {
      messages[recieverId] = [message];
    } else {
      messages[recieverId].push(message);
    }

    // send the msg to the reciever

    io.to(user?.socketId).emit("getMessage", message);
  });

  socket.on("messageSeen", ({ senderId, recieverId, messageId }) => {
    const user = getUSer(senderId);

    // update the seen flag for the msg
    if (messages[senderId]) {
      const message = messages[senderId].find(
        (message) =>
          message.recieverId === recieverId && message.id === messageId
      );
      if (message) {
        message.seen = true;

        // send a message seen event to the sender

        io.to(user?.socketId).emit("messageSeen", {
          senderId,
          recieverId,
          messageId,
        });
      }
    }
  });

  // update get last message

  socket.on("updateLastMessage", ({ lastMessage, lastMessageId }) => {
    io.emit("getLastMessage", {
      lastMessage,
      lastMessageId,
    });
  });
  // when disconnected

  socket.on("disconnect", () => {
    console.log(`a user disconnected!`);
    removeUser(socket.id);
    io.emit("getUsers", users);
  });
});

server.listen(process.env.PORT || 4000, () => {
  console.log(`server is running on port ${process.env.PORT || 4000}`);
});
