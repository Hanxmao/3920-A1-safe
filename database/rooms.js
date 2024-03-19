const database = include('databaseConnection');

async function getRooms(postData) {
    let SQL = `
        select R.* from user U
        join room_user RU on RU.user_id = U.user_id
        join room R on RU.room_id = R.room_id
        where U.username = :user;
    `;

    let params = {
        user: postData.user
    }

    try {
        const results = await database.query(SQL, params);

        console.log("Successfully loaded groups");
        console.log(results[0]);
        return results[0];
    }
    catch (err) {
        console.log("Error getting groups");
        console.log(err);
        return false;
    }
}


async function createRoom(postData) {
    let createRoomSQL = `
        INSERT INTO room
        (name, start_datetime)
        VALUES
        (:room_name, :start_datetime);
    ` 
    let params = {
        room_name : postData.room_name ,
        start_datetime: new Date().toISOString()
    }

    try {
        const results = await database.query(createRoomSQL, params);
        console.log("Successfully created room");
		console.log(results[0].insertId);
		return results[0].insertId;
	}
	catch(err) {
		console.log("Error inserting room");
        console.log(err);
		return false;
	}
}


async function createRoomUser(postData) {
    let SQL = `
        INSERT INTO room_user
        (user_id, room_id, last_read_message_id)
        VALUES
        (:user_id, :room_id, null);
    ` 
    let params = {
        user_id : postData.user_id ,
        room_id: postData.room_id
    }

    try {
        const results = await database.query(SQL, params);
        console.log("Successfully created room user");
		console.log(results[0]);
		return true;
	}
	catch(err) {
		console.log("Error inserting room user");
        console.log(err);
		return false;
	}
}

async function getUserRoomMessageInfo(postData) {
    let SQL = `
        select ru.room_id, r.name,  MAX(room_unread.sent_datetime) AS last_message_time,COUNT(CASE WHEN room_unread.message_id is not NULL THEN 1 ELSE NULL END) AS unread_message_count
        from  room_user as ru join room as r on r.room_id = ru.room_id
        left join (
            select  ru.room_id, m.message_id, m.sent_datetime
            from message as m
            join room_user as ru on m.room_user_id = ru.room_user_id
            where m.message_id > ru.last_read_message_id
        ) as room_unread on room_unread.room_id = ru.room_id
        where ru.user_id=:user_id
        group by r.name;
    `

    let params = {
        user_id : postData.user_id
    }

    try {
        const results = await database.query(SQL, params);
        console.log("Successfully retrieved rooms");
		console.log(results[0]);
		return results[0];
	}
	catch(err) {
		console.log("Error getting rooms");
        console.log(err);
		return null;
	}
}

async function getUserNotInRoom(postData) {
    let SQL = `
    select u.* 
    from user as u
    where u.user_id not in(
        select ru.user_id 
       from room_user as ru
       where room_id=:room_id
    );
    `

    let params = {
        room_id : postData.room_id
    }

    try {
        const results = await database.query(SQL, params);
        console.log("Successfully get users not room");
		console.log(results[0]);
		return results[0];
	}
	catch(err) {
		console.log("Error getting users not room");
        console.log(err);
		return null;
	}
}

async function getRoomUserId(postData) {
    let getRoomUserIdSQL = `
    select room_user_id from room_user 
    where user_id = :user_id and room_id = :room_id;
    `;

    let params = {
        user_id: postData.user_id,
        room_id: postData.room_id
    }

    try {
        const results = await database.query(getRoomUserIdSQL, params);

        console.log("Successfully got room user id");
        console.log(results[0]);
        return results[0];
    }
    catch (err) {
        console.log("Error getting room user id");
        console.log(err);
        return false;
    }
}


module.exports = {getRooms, createRoom, getUserRoomMessageInfo, createRoomUser, getUserNotInRoom, getRoomUserId};