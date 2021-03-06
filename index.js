#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const mm = require('musicmetadata')
const execSync = require('child_process').execSync
const exec = require('child_process').exec
const eachLimit = require('async/eachLimit')
const mapLimit = require('async/mapLimit')

const ds = require('./ds-client')

const srcPath = process.argv.slice(2)[0]
const srcFolder = path.basename(srcPath)
const destPath = `${path.dirname(srcPath)}/dsaudio`

let sid = null

const readSourceDir = () => fs.readdirSync(srcPath).filter( file => !file.startsWith('.') )

const getFilesData = (files) => new Promise( (resolve, reject) => mapLimit(
  files,
  8,
  (file, callback) => fetchFileData(file).then(metadata => {
      console.log(`${metadata.artist} - ${metadata.title} : ${metadata.exists? 'V' : 'X'}`)
      metadata.file = file
      callback(null, metadata)
  }),
  (err, results) => resolve(results)
))

const fetchFileData = (file) => {
  return readFileMetaData(file).then( metadata => {
    return ds.fetch('/AudioStation/search.cgi?' +
      'api=SYNO.AudioStation.Search&version=1&method=list&library=shared&' +
      'additional=song_tag&sort_by=title&sort_direction=ASC&limit=100&' +
      `keyword=${encodeURIComponent(metadata.title)}`)
    .then(json => {
      matchedSongs = (json.data && json.data.songs || []).filter( song => {
        //console.log( song.title + '<>' + metadata.title + '&' + song.additional.song_tag.artist  + '<>' + metadata.artist[0])

        return song.title.trim() == metadata.title.trim() &&
          song.additional.song_tag.artist.trim() == metadata.artist[0].trim()
      })

      metadata.exists = matchedSongs.length > 0
      if (metadata.exists) { metadata.dsPath = matchedSongs[0].path }
      return metadata
    })
  })
}

const readFileMetaData = (file) => {
  return new Promise( (resolve, reject) => {
    mm(fs.createReadStream(`${srcPath}/${file}`), function (err, metadata) {
      if (err) reject(err)
      resolve(metadata)
    })
  })
}

const createDestinationDir = () => {
  execSync(`mkdir -p ${destPath}`)
  execSync(`mkdir -p ${destPath}/${srcFolder}`)
  execSync(`mkdir -p ${destPath}/playlists`)
}

const createPlaylist = (fileData, playlistName) => {
  const writeStream = fs.createWriteStream(`${destPath}/playlists/${playlistName}`)
  fileData.forEach(fileData => {
    if (fileData.dsPath) {
       writeStream.write(`${fileData.dsPath}\n`)
    } else {
      writeStream.write(`../${srcFolder}/${fileData.artist} - ${fileData.title}.m4a\n`)
    }
 })

  writeStream.end()
}

const convert = fileDatas => {
  eachLimit(fileDatas, 6, (fileData, callback) => {
      command = `ffmpeg -i "${srcPath}/${fileData.file}" -c:a libfdk_aac -profile:a aac_he -b:a 64k -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -vsync 2 "${destPath}/${srcFolder}/${fileData.artist[0]} - ${fileData.title}.m4a"`
      console.log(command)
      exec(command, callback)
    }
  )
}

const run = () => {
  ds.authenticate()
  .then(getFilesData(readSourceDir()))
  .then( filesData => {
    createDestinationDir()

    const existingFiles = filesData.filter( fileData =>fileData.exists )
    const newFiles = filesData.filter( fileData => !fileData.exists )
    createPlaylist(existingFiles, 'exist.m3u')
    createPlaylist(newFiles, 'new.m3u')
    //convert(newFiles)
  })
}

run()
