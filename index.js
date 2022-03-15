'use strict'

/**
 * Module dependencies.
 */

const express = require('express');
const cors = require('cors')
const bodyParser = require('body-parser')
const uuid = require('uuid').v4
const axios = require('axios')

const app = module.exports = express();

// config

// app.set('view engine', 'ejs');
// app.set('views', path.join(__dirname, 'views'));

// middleware

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(cors())
app.use(bodyParser.json());
// app.use(session({
//   resave: false, // don't save session if unmodified
//   saveUninitialized: false, // don't create session until something stored
//   secret: 'shhhh, very secret'
// }));


// dummy database

const baseURL = 'https://shineyoureye.org/api'
let governors = []
let senators = []
let localGovtOff = []

async function getGovernors () {
  let response = await axios.get(`${baseURL}/people/governors`)
  return response.data.data.people[0].persons
}

async function getLGTHeads (state = '') {
  let response = await axios.get(`${baseURL}/people/states/${state}`)
  return response.data.data.people
}

function abbreviate (phrase, delimiter = '') {
  return phrase.split(' ').map(word => word.slice(0, 1)).join(delimiter)
}

app.get('/', (req, res) => {
    let puNumber = req.query.pu.split('/')
    if (!puNumber) {
      res.send({text: 'You didn\'t supply a PU number. Check the example key for a sample usecase', example: 'https://sye-bknd.herokuapp.com/?pu=26/18/67/09'})
    }
    let governor = null
    let lgtMan = null
    let state = ''
    let senatorialDestrict = ''
    let localGovt = ''
    let senator = null
    let rep = null
    let assembly = null
    const userResponse = {
      governor: {},
      local_government_chairman: {},
      house_of_assembly: [],
      senator: {},
      house_of_representatives: {}
    }

    getGovernors().then(data => {
      governor = data.find(person => person.area.place.id === +puNumber[0])
      console.log(puNumber[0]);
      
      // Derive Governor Info
      userResponse.governor.name = governor.name
      userResponse.governor.state = governor.state
      userResponse.governor.party = `${governor.party} (${abbreviate(governor.party)})`
      userResponse.governor.phone = governor?.contact?.phone?.value
      userResponse.governor.email = governor?.contact?.email?.value
      userResponse.governor.twitter = governor?.contact?.twitter?.value
      
      // Get the state -> Useful for later
      state = governor.state
      
      getLGTHeads(state).then(data => {
        // Sort and conquer data
        let stateOfficials = (data.map((obj, i) => obj.persons[state])).flat(2)
        let localMan = stateOfficials.find(person => person?.area?.place?.codes?.poll_unit?.includes(puNumber[1]))

        // store a reference
        lgtMan = localMan
        localGovt = localMan?.area?.place?.name

        // Derive Local Government Chairman
        userResponse.local_government_chairman.name = localMan.name
        userResponse.local_government_chairman.area = localGovt
        userResponse.local_government_chairman.party = `${localMan.party} (${abbreviate(localMan.party)})`
        userResponse.local_government_chairman.phone = localMan?.contact?.phone?.value

        // Sort and conquer data
        senatorialDestrict = localMan?.area?.parent_place?.name
        senator = stateOfficials.find(person => person?.area?.place?.name === senatorialDestrict)
        
        // Deriving the senator
        userResponse.senator.name = senator.name
        userResponse.senator.district = senatorialDestrict
        userResponse.senator.party = `${senator.party} (${abbreviate(senator.party)})`
        userResponse.senator.phone = senator?.contact?.phone?.value
        userResponse.senator.email = senator?.contact?.email?.value
        userResponse.senator.twitter = senator?.contact?.twitter?.value

        // Sort and conquer data
        let allReps = (data.filter(obj => obj.organization === 'House of Representatives')).map(obj => {
          return obj.persons[state]
        }).flat(1)

        rep = allReps.find(rep => rep?.area?.place?.name?.includes(localGovt))

        // Deriving the representative
        userResponse.house_of_representatives.name = rep.name
        userResponse.house_of_representatives.area = rep?.area?.place?.name
        userResponse.house_of_representatives.party = `${rep.party} (${abbreviate(rep.party)})`
        userResponse.house_of_representatives.phone = rep?.contact?.phone?.value
        userResponse.house_of_representatives.email = rep?.contact?.email?.value

        // Sort and conquer data
        let allAssembly = (data.filter(obj => obj.organization === 'State Houses of Assembly')).map(obj => {
          return obj.persons[state]
        }).flat(1)
        assembly = allAssembly.filter(assemblyRep => assemblyRep?.area?.place?.name?.includes(localGovt))

        // Derive State Assembly info
        let final = assembly.map(obj => {
          return {
            name: obj.name,
            area: obj?.area?.place?.name,
            party: `${obj.party} (${abbreviate(obj.party)})`,
            phone: obj?.contact?.phone?.value,
            email: obj?.contact?.email?.value,
          }
        })

        userResponse.house_of_assembly = final

        // Log user response
        console.log(userResponse);
        res.send(userResponse)
      })
    }) 
})

app.post('/webhook', (req, res) => {
  console.log(req.body.messages, 'value');
    // let puNumber = req.body.pu.split('/')
    // let puNumber
    // if (!puNumber) {
    //   res.send({text: 'You didn\'t supply a PU number. Check the example key for a sample usecase', example: 'POST / https://sye-bknd.herokuapp.com {pu: 26/18/67/09}'})
    // }
    // let governor = null
    // let lgtMan = null
    // let state = ''
    // let senatorialDestrict = ''
    // let localGovt = ''
    // let senator = null
    // let rep = null
    // let assembly = null
    // const userResponse = {
    //   governor: {},
    //   local_government_chairman: {},
    //   house_of_assembly: [],
    //   senator: {},
    //   house_of_representatives: {}
    // }

    // getGovernors().then(data => {
    //   governor = data.find(person => person.area.place.id === +puNumber[0])
    //   console.log(puNumber[0]);
      
    //   // Derive Governor Info
    //   userResponse.governor.name = governor.name
    //   userResponse.governor.state = governor.state
    //   userResponse.governor.party = `${governor.party} (${abbreviate(governor.party)})`
    //   userResponse.governor.phone = governor?.contact?.phone?.value
    //   userResponse.governor.email = governor?.contact?.email?.value
    //   userResponse.governor.twitter = governor?.contact?.twitter?.value
      
    //   // Get the state -> Useful for later
    //   state = governor.state
      
    //   getLGTHeads(state).then(data => {
    //     // Sort and conquer data
    //     let stateOfficials = (data.map((obj, i) => obj.persons[state])).flat(2)
    //     let localMan = stateOfficials.find(person => person?.area?.place?.codes?.poll_unit?.includes(puNumber[1]))

    //     // store a reference
    //     lgtMan = localMan
    //     localGovt = localMan?.area?.place?.name

    //     // Derive Local Government Chairman
    //     userResponse.local_government_chairman.name = localMan.name
    //     userResponse.local_government_chairman.area = localGovt
    //     userResponse.local_government_chairman.party = `${localMan.party} (${abbreviate(localMan.party)})`
    //     userResponse.local_government_chairman.phone = localMan?.contact?.phone?.value

    //     // Sort and conquer data
    //     senatorialDestrict = localMan?.area?.parent_place?.name
    //     senator = stateOfficials.find(person => person?.area?.place?.name === senatorialDestrict)
        
    //     // Deriving the senator
    //     userResponse.senator.name = senator.name
    //     userResponse.senator.district = senatorialDestrict
    //     userResponse.senator.party = `${senator.party} (${abbreviate(senator.party)})`
    //     userResponse.senator.phone = senator?.contact?.phone?.value
    //     userResponse.senator.email = senator?.contact?.email?.value
    //     userResponse.senator.twitter = senator?.contact?.twitter?.value

    //     // Sort and conquer data
    //     let allReps = (data.filter(obj => obj.organization === 'House of Representatives')).map(obj => {
    //       return obj.persons[state]
    //     }).flat(1)

    //     rep = allReps.find(rep => rep?.area?.place?.name?.includes(localGovt))

    //     // Deriving the representative
    //     userResponse.house_of_representatives.name = rep.name
    //     userResponse.house_of_representatives.area = rep?.area?.place?.name
    //     userResponse.house_of_representatives.party = `${rep.party} (${abbreviate(rep.party)})`
    //     userResponse.house_of_representatives.phone = rep?.contact?.phone?.value
    //     userResponse.house_of_representatives.email = rep?.contact?.email?.value

    //     // Sort and conquer data
    //     let allAssembly = (data.filter(obj => obj.organization === 'State Houses of Assembly')).map(obj => {
    //       return obj.persons[state]
    //     }).flat(1)
    //     assembly = allAssembly.filter(assemblyRep => assemblyRep?.area?.place?.name?.includes(localGovt))

    //     // Derive State Assembly info
    //     let final = assembly.map(obj => {
    //       return {
    //         name: obj.name,
    //         area: obj?.area?.place?.name,
    //         party: `${obj.party} (${abbreviate(obj.party)})`,
    //         phone: obj?.contact?.phone?.value,
    //         email: obj?.contact?.email?.value,
    //       }
    //     })

    //     userResponse.house_of_assembly = final

    //     // Log user response
    //     console.log(userResponse);
    //     // res.send(userResponse)
        if (req.body.messages[0].text.body == 5) {
          res.setHeader('Authorization', `bearer eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJUdXJuIiwiZXhwIjoxNjc4ODU0OTk1LCJpYXQiOjE2NDczMTkwMzYsImlzcyI6IlR1cm4iLCJqdGkiOiIyNTNjMGU0Ni05OGU4LTRhZWYtYjc1ZS0zNmQ2ZDg5ZTk4NzciLCJuYmYiOjE2NDczMTkwMzUsInN1YiI6Im51bWJlcjoyNzY3IiwidHlwIjoiYWNjZXNzIn0.-DVZKHpEZ68laHCCzy4ZVcAsxvsimsyOuo0k99Sd-wqsfZof82EF_7icq9eJtkiea_M1u0mCk4VJHdVkq8Vhdw`)
          res.setHeader('Content-Type', 'application/json')
          // res.setHeader('X-WhatsApp-Id', req.body.messages[0].id)
          res.send({
            "preview_url": false,
            "recipient_type": "individual",
            "to": req.body.messages[0].from,
            "type": "text",
            "text": {
                "body": "Enter Your PU number"
            }
        })
        }

        if (req.body.messages[0].text.body.split('/').length === 4) {
          res.setHeader('Authorization', `bearer eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJUdXJuIiwiZXhwIjoxNjc4ODU0OTk1LCJpYXQiOjE2NDczMTkwMzYsImlzcyI6IlR1cm4iLCJqdGkiOiIyNTNjMGU0Ni05OGU4LTRhZWYtYjc1ZS0zNmQ2ZDg5ZTk4NzciLCJuYmYiOjE2NDczMTkwMzUsInN1YiI6Im51bWJlcjoyNzY3IiwidHlwIjoiYWNjZXNzIn0.-DVZKHpEZ68laHCCzy4ZVcAsxvsimsyOuo0k99Sd-wqsfZof82EF_7icq9eJtkiea_M1u0mCk4VJHdVkq8Vhdw`)
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('X-WhatsApp-Id', req.body.messages[0].id)
          res.send({
            "preview_url": false,
            "recipient_type": "individual",
            "to": req.body.messages[0].from,
            "type": "text",
            "text": {
                "body": "Correct Guy"
            }
        })
        }
      // })
    // }) 
})

/* istanbul ignore next */
if (!module.parent) {
  app.listen(process.env.PORT || 5000);
  console.log('Express started on port 5000');
}