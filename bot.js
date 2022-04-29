'use strict'

/**
 * Module dependencies.
 */

const express = require('express');
const cors = require('cors')
const bodyParser = require('body-parser')
const axios = require('axios')

require('dotenv').config();

// Instantiate App
const app = module.exports = express();

// config
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(cors())
app.use(bodyParser.json());

// Function to Abbreviate
function abbreviate (phrase = '', delimiter = '') {
    return phrase.split(' ').map(word => word.slice(0, 1)).join(delimiter)
}

// Turn Token
const TURN_TOKEN = process.env.TURN_TOKEN;
console.log(TURN_TOKEN);

// Function to send messages
function sendMessage(contact_id, content) {
    axios.post("https://whatsapp.turn.io/v1/messages",{
        "recipient_type": "individual",
        "to": contact_id,
        "type": "text",
        "text": {
            "body": content
        }
    },{
        headers : {
            "Authorization" : "Bearer " + TURN_TOKEN,
            "Content-Type" : "application/json"
        }
    })
    .then(response => {
        console.log(response.data.messages, 'Response Recieved')
    })
    .catch(err => {
        // console.log(err);
    })
}

// Function for getting PU Info
async function getPuInfo (puNumber) {
    let response = await axios.get(`https://shineyoureye.org/api/places/pu-lookup?lookup=${puNumber}`)
    return response.data.data
}

// Function for getting full place data
const getData = async (place_url) => {
    let response = await axios.get(`https://shineyoureye.org/api/places/${place_url}`)
    return response.data.data
}

// Function to generate statement strings
const generateOfficialStatement = (officials, category) => {
    let statementList = officials.map((person, index) => {
        return `*Your ${category}* ${officials.length > 1 ? `(${index + 1})` : ''}\n*Name:* ${person?.name}\n*Area:* ${person?.area.place.name}\n*Party:* ${`${person?.party} (${abbreviate(person.party)})`}\n*Phone:* ${person?.contact.phone.value || 'Not Available'}\n*Email:* ${person?.contact.email.value || 'Not Available'}\n\n`
    });

    return statementList.join('')
}


// Recieve whatsapp requests at this endpoint
app.post('/webhook', (req, res) => {
    console.log(req.body.messages[req.body.messages.length - 1].text.body, 'value');
    let puNumber = req.body.messages[req.body.messages.length - 1].text.body.split(/[/:.-\s]/)
  
    if (puNumber.length === 4 && puNumber.every(num => !Number.isNaN(parseFloat(num)))) {
      res.status(200).json({message: 'OK'})
      sendMessage(req.body.messages[0].from, 'One moment while we fetch that information. \nType *Menu* to return to the main screen.')
  
      getPuInfo(puNumber.join('/')).then(data => {
        getData(data.place_url).then(data => {
            console.log('-------- START -------\n\n');
            // Message Header
            let messageBody = `Your PU Number is ${puNumber.join('-')}\n\n_Your elected officials are:_\n\n`
            // For Governor
            let gMsg = generateOfficialStatement(data.people.governor, 'Governor')
            // For Local Government Chairman
            let lgMsg = generateOfficialStatement(data.people.localgovernment, 'Local Government Chairman')
            // For State House of assembly
            let shaMsg = generateOfficialStatement(data.people.honorables, 'State Assembly Member')
            // For Senator
            let senMsg = generateOfficialStatement(data.people.senate, 'Senator')
            // For Representatives
            let repMsg = generateOfficialStatement(data.people.representatives, 'Representatives')
            // Notice
            let extraMsg = `If your PU number is not available, visit www.shineyoureye.org\n\nType *Menu* to go back to the main menu.`
    
            // Combine all messages together
            let msgPipeline = [messageBody, gMsg, lgMsg, shaMsg, senMsg, repMsg].join('----------------------------\n\n')
            
            // Keep a copy in the logs
            console.log(msgPipeline);
            console.log(extraMsg);

            // Send the message
            sendMessage(req.body.messages[0].from, msgPipeline)
            sendMessage(req.body.messages[0].from, extraMsg)
            console.log('\n\n-------- END -------');
        })
    })
          
    } else {
      res.status(200).json({message: 'OK'})
      sendMessage(req.body.messages[0].from, 'We could not get any data for this PU Number. Please check to see if the PU number you entered is correct')
    }
  
  })


/* istanbul ignore next */
const port = process.env.PORT || 5000
if (!module.parent) {
  app.listen(port);
  console.log(`Express started on port ${port}`);
}