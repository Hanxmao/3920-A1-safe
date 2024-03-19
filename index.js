require('./utils');

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const saltRounds = 12;


const database = include('databaseConnection');
const db_utils = include('database/db_utils');
const db_users = include('database/users');
const db_rooms = include('database/rooms')
const db_messages = include('database/messages')
const success = db_utils.printMySQLVersion();

const port = process.env.PORT || 3000;

const app = express();

const expireTime = 24 * 60 * 60 * 1000; //expires after 1 day  (hours * minutes * seconds * millis)


/* secret information section */
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;

const node_session_secret = process.env.NODE_SESSION_SECRET;
/* END secret section */

// helper
function timeAgo(date) {
    const now = new Date();
    const diff = now - date;

    // Convert milliseconds to seconds
    const seconds = Math.floor(diff / 1000);

    if (seconds < 60) {
        return seconds + " seconds ago";
    } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        return minutes + " minutes ago";
    } else if (seconds < 86400) {
        const hours = Math.floor(seconds / 3600);
        return hours + " hours ago";
    } else {
        const days = Math.floor(seconds / 86400);
        return days + " days ago";
    }
}

app.set('view engine', 'ejs');

app.use(express.urlencoded({extended: false}));

var mongoStore = MongoStore.create({
    mongoUrl:`mongodb+srv://${mongodb_user}:${mongodb_password}@3920-a1.rhwrzv7.mongodb.net/?retryWrites=true&w=majority`,
	crypto: {
		secret: mongodb_session_secret
	}
})

app.use(session({ 
    secret: node_session_secret,
	store: mongoStore, //default is memory store 
	saveUninitialized: false, 
	resave: true
}
));

//TODO: authorise

function isValidSession(req) {
	if (req.session.authenticated) {
		return true;
	}
	return false;
}

function sessionValidation(req, res, next) {
	if (!isValidSession(req)) {
		req.session.destroy();
		res.redirect('/');
		return;
	}
	else {
		next();
	}
}

app.get('/', (req,res) => {
    if(req.session.username==undefined){
        res.render("index", {showName: false, username: undefined});
    } else {
        console.log("req",req.session);
        res.render("index", {showName: true, username: req.session.username});
    }
   
});

app.post('/submitEmail', (req,res) => {
    var email = req.body.email;
    if (!email) {
        res.redirect('/contact?missing=1');
    }
    else {
        res.render("submitEmail", {email: email});
    }
});


app.get('/signup', (req,res) => {
    var missing = req.query.missing??-1;
    res.render("signup", {missing:missing, username:undefined});
});


app.get('/login', (req,res) => {
    var bad = req.query.bad??0;
    res.render("login", {bad:bad, username:undefined});
});

app.post('/submitUser', async (req,res) => {
    var username = req.body.username;
    var password = req.body.password;
    let missing = -1
    if(password.length<=0 || !password){
        missing=0
    } 
    if(!username){
        missing=1
    }
    if(!username&&!password){
        missing=2
    }


    if (missing<0){
        var hashedPassword = bcrypt.hashSync(password, saltRounds);

        var success = await db_users.createUser({ user: username, hashedPassword: hashedPassword });
    
        if (success) {
            req.session.authenticated = true;
            req.session.username = username;
            req.session.cookie.maxAge = expireTime;
            res.redirect("/");
        }
        else {
            res.render("errorMessage", {error: "Failed to create user."} );
        }
    } else{
        res.redirect(`/signup?missing=${missing}`)
    }

});

app.post('/loggingin', async (req,res) => {
    var username = req.body.username;
    var password = req.body.password;


    var results = await db_users.getUser({ user: username, hashedPassword: password });

    if (results) {
        if (results.length == 1) { //there should only be 1 user in the db that matches
            if (bcrypt.compareSync(password, results[0].password)) {
                req.session.authenticated = true;
                req.session.username = username;
                req.session.cookie.maxAge = expireTime;
                res.redirect(`/`);
                return;
            }
            else {
                console.log("invalid password");
            }
        }
        else {
            console.log('invalid number of users matched: '+results.length+" (expected 1).");
            res.redirect('/login?bad=1');
            return;            
        }
    }

    console.log('user not found');
    //user and password combination not found
    res.redirect("/login?bad=1");
});

app.use('/rooms', sessionValidation);

app.get('/rooms', async(req,res) => {
    const currentUser = await db_users.getUser({user:req.session.username})
    const rooms = await db_rooms.getUserRoomMessageInfo({ user_id: currentUser[0].user_id});
    res.render("rooms", {username: req.session.username, rooms:rooms});

});

app.get('/createRoom', async(req,res) => {
    const inviteUsers = await db_users.getUsers()
    res.render("createRoom", {username: req.session.username, inviteUsers:inviteUsers});
});



app.post('/creatingRoom', async (req,res) => {
    const room_name = req.body.room_name;
    const insert_id = await db_rooms.createRoom({ room_name: room_name });
    const invitedUsers = req.body.invitedUser;
    console.log("asdf",invitedUsers);
    const user = await db_users.getUser({ user: req.session.username});
    if(insert_id){
        await db_rooms.createRoomUser({user_id:user[0].user_id, room_id:insert_id})
        for (let i = 0; i < invitedUsers.length; i++) {
            console.log("aaa",invitedUsers[i]);
            await db_rooms.createRoomUser({ user_id: invitedUsers[i], room_id: insert_id })
            console.log("successfully insert user into the room");
        }
        res.redirect(`/`);
        return;
    } else {
        console.log("fail to create room");
        return 
    }
})

app.post('/inviteUsers', async (req,res) => {
    const invitedUser = req.body.invitedUser;
    const room_id = req.query.room_id;
    for (let i = 0; i < invitedUser.length; i++) {
        console.log("aaa",invitedUser[i]);
        await db_rooms.createRoomUser({ user_id: invitedUser[i], room_id: room_id })
        console.log("successfully insert user into the room");
    }
    res.redirect(`/rooms/${room_id}`)

})

app.get('/rooms/:id', async (req, res)=>{
    const room_id = req.params.id;
    const canInvitedUsers =await db_rooms.getUserNotInRoom({room_id:room_id})
    const messages =await db_messages.getMessages({room_id:room_id})
    const currentUser = await db_users.getUser({user:req.session.username})
    const last_read_message_id = await db_messages.getLastReadMessageId({user_id:currentUser[0].user_id,room_id:room_id})
    messages.map((message)=>{
        message.sent_datetime = timeAgo(new Date(message.sent_datetime))
    })
    const read_messages = messages.filter((message)=>{return parseInt(message.message_id)<=parseInt(last_read_message_id[0].last_read_message_id)})
    const unread_messages = messages.filter((message)=>{return parseInt(message.message_id)>parseInt(last_read_message_id[0].last_read_message_id)})

    const message_ids = messages.map((message)=>{return parseInt(message.message_id)})
    const max_message_id = Math.max(...message_ids);
    console.log("asdf",max_message_id);
    await db_messages.updateLastReadMessageId({last_read_message_id: max_message_id, user_id:currentUser[0].user_id,room_id:room_id})

    res.render("room", {username: req.session.username, room_id:room_id, canInvitedUsers:canInvitedUsers, read_messages:read_messages, unread_messages:unread_messages})
})

app.post('/sendText', async (req, res) => {
    var username = req.session.username;
    var room_id = req.body.room_id;
    var text = req.body.text;
    var userID = await db_users.getUser({user:username})

    var room_user_id = await db_rooms.getRoomUserId({ room_id: room_id, user_id: userID[0].user_id });

    if (room_user_id) {
        console.log(room_user_id);
        try {
            var success = await db_messages.sendMessage({ room_user_id: room_user_id[0].room_user_id, text: text });
            if (success) {
                res.redirect(`/rooms/${room_id}`);
            } else {
                res.render("errorMessage", { error: "Failed to send message." });
            }
        } catch {
            res.render("errorMessage", { error: "Failed to send message." });
        }
    }
})

app.get('/logout', function(req, res) {
    req.session.destroy();
    currentUser = null
    res.redirect('/');
});


app.use(express.static(__dirname + "/public"));

app.get("*", (req,res) => {
	res.status(404);
	res.render("404");
})

app.listen(port, () => {
	console.log("Node application listening on port "+port);
}); 