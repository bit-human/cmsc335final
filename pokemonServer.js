const portNumber = process.env.PORT;

const express = require("express"); /* Accessing express module */

const app = express(); /* app is a request handler function */

const path = require("path");

const bodyParser = require("body-parser"); /* To handle post parameters */

const https = require("https");

const pokeapi = "pokeapi.co"
const numPokemon = 100000

/* directory where templates will reside */
app.set("views", path.resolve(__dirname, "templates"));
app.use('/public', express.static('public'));

/* view/templating engine */
app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({extended:false}));

app.get("/", (request, response) => {
    response.render("index", {});
  });
app.get("/favoritepokemon", (request, response) => {
    var details = {
        host: pokeapi,
        path: `/api/v2/pokemon?limit=${numPokemon}&offset=0`
      }
    https.get(details, function (res) {
		let data = '';
		res.on('data', (chunk) => {
			data = data + chunk.toString();
		}).on('end', () => {
			var json = JSON.parse(data.toString());
			
            pokedex = ""

            for (i = 0; i < json.results.length; i++) {
                pokemon = json.results[i].name
                pokedex += `<option value="${pokemon}">${pokemon}</option>`
            }

			const variables = {"pokedex":pokedex};

            response.render("favoritepokemon", variables);
		});
	}).on('error', (e) => {
		console.error(`Got error: ${e.message}`);
	});

    
  });
app.post("/processfavorite", (request, response) => {
    let {trainer, favpokemon} =  request.body;

    var details = {
        host: pokeapi,
        path: `/api/v2/pokemon/${favpokemon}`
      }
    https.get(details, function (res) {
		let data = '';
		res.on('data', (chunk) => {
			data = data + chunk.toString();
		}).on('end', () => {
			var json = JSON.parse(data.toString());

            var types = json.types
            var type = types[0].type.name
            if (types.length == 2)
                type += ", " + types[1].type.name
            var url = json.sprites.front_default

            const variables = {"trainer":trainer,"favpokemon":favpokemon,"type":type,"url":url};
            
            insert(variables)

            response.render("processfavorite", variables);
		});
	}).on('error', (e) => {
		console.error(`Got error: ${e.message}`);
	});

    
  });
app.get("/reviewfavorite", (request, response) => {
    response.render("reviewfavorite", {});
  });
app.post("/processreview", (request, response) => {
    let {trainer} =  request.body;

    read(trainer, response)
  });

app.listen(portNumber)

console.log(`Web server started and running at http://localhost:${portNumber}`);
process.stdout.write("Stop to shutdown the server: ");
process.stdin.setEncoding("utf8"); /* encoding */
process.stdin.on('readable', () => {  /* on equivalent to addEventListener */
	let dataInput = process.stdin.read();
	if (dataInput !== null) {
		let command = dataInput.trim();
		if (command === "stop") {
			console.log("Shutting down the server");
            process.exit(0);  /* exiting */
        } else {
			/* After invalid command, we cannot type anything else */
			console.log(`Invalid command: ${command}`);
            process.stdout.write("Stop to shutdown the server: ");
            process.stdin.resume();
		}
    }
});

require("dotenv").config({ path: path.resolve(__dirname, 'credentials/.env') }) 

const uri = process.env.MONGO_CONNECTION_STRING;

 const databaseAndCollection = {
    db: process.env.MONGO_DB_NAME, 
    collection: process.env.MONGO_COLLECTION
};

const { MongoClient, ServerApiVersion } = require('mongodb');
async function insert(variables) {
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
    try {
        await client.connect();       
        await deleteOne(client, databaseAndCollection, variables.trainer);
        await insertTrainer(client, databaseAndCollection, variables);
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

async function insertt(variables) {
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
    try {
        await client.connect();       
        await insertTrainer(client, databaseAndCollection, variables);
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}


async function insertTrainer(client, databaseAndCollection, newTrainer) {
    const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(newTrainer);

    console.log(`Applicant entry created with id ${result.insertedId}`);
}

async function read(trainerName, response) {
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

    try {
        await client.connect();
        await lookUpOneEntry(client, databaseAndCollection, trainerName, response);
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

async function lookUpOneEntry(client, databaseAndCollection, trainerName, response) {
    let filter = {"trainer": trainerName};
    const result = await client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .findOne(filter);

    if (result) {
        console.log(`Trainer entry found with id ${result._id}`)

        let {favpokemon,type,url} =  result;
        const variables = {"trainer":trainerName,"favpokemon":favpokemon,"type":type,"url":url};

        response.render("processfavorite", variables);
    } else {
        const variables = {"trainer":"Not found","favpokemon":"","type":"","url":""};
        response.render("processfavorite", variables);
    }
}

async function deleteOne(client, databaseAndCollection, trainerName) {
    let filter = {trainer: trainerName};
    const result = await client.db(databaseAndCollection.db)
                   .collection(databaseAndCollection.collection)
                   .deleteOne(filter);
}