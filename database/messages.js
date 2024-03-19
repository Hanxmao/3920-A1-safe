const database = include('databaseConnection');

async function createMessage(postData) {
    let createMessageSQL = `
        INSERT INTO message
        (room_user_id, sent_datetime, text)
        VALUES
        (:room_user_id, :sent_datetime, :text);
    ` 

    let params = {
        room_user_id: postData.room_user_id,
        sent_date_time: postData.sent_date_time,
        text: postData.text,
    }

    try {
        const results = await database.query(createMessageSQL, params);
        console.log("Successfully created message");
		console.log(results[0]);
		return true;
	}
	catch(err) {
		console.log("Error inserting message");
        console.log(err);
		return false;
	}
}

async function getMessages(postData) {
    let SQL = `
    select m.message_id, m.sent_datetime, m.text, ru.user_id, u.username 
    from message m
    join room_user ru on m.room_user_id = ru.room_user_id
    join user u on ru.user_id = u.user_id
    and ru.room_id = :room_id
    order by m.sent_datetime;     
    ` 

    let params = {
        room_id: postData.room_id
    }

    try {
        const results = await database.query(SQL, params);
        console.log("Successfully get message");
		console.log(results[0]);
		return results[0];
	}
	catch(err) {
		console.log("Error fetching message");
        console.log(err);
		return null;
	}
}

async function getLastReadMessageId(postData) {
    let SQL = `
        select ru.last_read_message_id
        from room_user as ru
        where user_id=:user_id and room_id=:room_id;
    ` 

    let params = {
        room_id: postData.room_id,
        user_id:postData.user_id
    }

    try {
        const results = await database.query(SQL, params);
        console.log("Successfully get last read message id");
		console.log(results[0]);
		return results[0];
	}
	catch(err) {
		console.log("Error fetching last read message id");
        console.log(err);
		return null;
	}
}

async function updateLastReadMessageId(postData) {
    let SQL = `
        UPDATE room_user
        SET last_read_message_id = :last_read_message_id
        WHERE user_id= :user_id and room_id= :room_id;
    ` 

    let params = {
        last_read_message_id: postData.last_read_message_id,
        user_id: postData.user_id,
        room_id: postData.room_id
    }

    try {
        const results = await database.query(SQL, params);
        console.log("Successfully update last read message id");
		console.log(results[0]);
		return true;
	}
	catch(err) {
		console.log("Error update last read message id");
        console.log(err);
		return false;
	}
}

async function sendMessage(postData) {
    let sendMessageSQL = `
    insert into message (room_user_id, text, sent_datetime) values (:room_user_id, :text, :sent_datetime);
    `;

    let params = {
        room_user_id: postData.room_user_id,
        text: postData.text,
        sent_datetime: new Date()
    }

    try {
        const results = await database.query(sendMessageSQL, params);

        console.log("Successfully sent message");
        console.log(results[0]);
        return results[0];
    }
    catch (err) {
        console.log("Error sending message");
        console.log(err);
        return false;
    }
}

module.exports = {createMessage, getMessages, getLastReadMessageId, updateLastReadMessageId, sendMessage};