const fs = require('fs')
const fetch = require('node-fetch')
const prompt = require('prompt-sync')();

let sid = null
let credentials = null
const dsUrl = 'http://192.168.1.184:5000/webapi'

const authenticate = () => {
  return new Promise( (resolve, reject) => {
    if(!sid) readSidFile()
      console.log(sid)
    dsFetch('/AudioStation/search.cgi?' +
      'api=SYNO.AudioStation.Search&version=1&method=list&library=shared&' +
      'additional=song_tag&sort_by=title&sort_direction=ASC&limit=1&' +
      `keyword=kosmos`
    )
    .then(resolve)
    .catch( e => {
      console.log(e)
      authAndStoreSid()
      .then(resolve).catch(reject)
    })
  })
}

const readSidFile = () => {
  try { 
    sid = require("./.sid").sid
  } catch (e) {console.log(e)}
}

const dsFetch = (...args) => {
  if (!sid) {
    return new Promise( (resolve, reject) => reject(Error("No Sid!")) ) 
  }

  args[0] = `${dsUrl}${args[0]}&_sid=${sid}`
  console.log(args)
  return fetch.apply(this, args)
    .then( res => res.json() )
    .then( json => json)
}

const authAndStoreSid = () => {
  promptCredentials()
  const url = `${dsUrl}/auth.cgi?api=SYNO.API.Auth&version=6&method=login&session=DownloadStation&format=sid&` +
              `account=${credentials.username}&passwd=${credentials.password}`
  console.log(url)
  return fetch(url)
  .then( res => res.json() )
  .then( json => {
    console.log(json)
    sid = json.data.sid
    fs.writeFileSync(".sid.json", JSON.stringify({sid: sid} ), "utf8")

    return sid
  })
}

const promptCredentials = () => {
  if(!credentials){
    credentials = {}
    credentials.username = prompt('username: ')
    credentials.password = prompt('password: ', {echo: '*'})
  }
  
  return promptCredentials
}

module.exports = {
  authenticate: authenticate,
  fetch: dsFetch
}
