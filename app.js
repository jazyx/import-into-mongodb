/**
 * app.js
 *
 * Launch with
 * 
 *   node app.js <fileName> <dbName> 
 *   
 * If either of these arguments are missing, you will be asked to
 * provide them.
 */

const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const readline = require('readline')
const fs = require('fs')

// Connection URL
const mongoURL = 'mongodb://localhost:27017';



;(function getSourceAndTarget([
  runtime
  , scriptname
  , dbName = "flashcards"
  , fileName = ""
  ]) {

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const data = {
    dbName: stripQuotes(dbName)
  , fileName: stripQuotes(fileName)
  }
  const dbPrompt = getPrompt("Database to use", dbName)
  const filePrompt = getPrompt("Import from file", fileName)

  rl.question(filePrompt, (answer) => {
    check("fileName", answer) // will call rl again with dbName
  })



  function getPrompt(prompt, givenInput) {
    if (givenInput) {
      return prompt + ` (default = ${givenInput}): `
    } else {
      return prompt + ": "
    }
  }


  function check(type, answer) {
    if (!answer && !data[type]) {
      return shutDown(
        "App requires database name and file name for import."
      )

    } else if (answer) {
      data[type] = stripQuotes(answer)
    }

    if (type === "fileName") {
      data.collection = getParentFolderName(data.fileName)

      rl.question(dbPrompt, (answer) => {
        check("dbName", answer)
      })
    } else {
      rl.close()
      checkSource(data)
    }
  }


  function stripQuotes(string) {
    let last   = string.length - 1
    let quotes = [0, "'", '"', "`"]

    while (trim(string)) {}

    return string

    function trim() {
      let char    = string[0]
      let isQuote = quotes.indexOf(char) > 0

      if (isQuote) {
        isQuote = string[last] = char
        if (isQuote) {
          string = string.substring(1, last)
          last -= 2
        }
      }

      return isQuote
    }
  }


  function getParentFolderName(filePath) {
    // /path/to/parentFolder/phrases.txt
    let array = filePath.split("/")
    array.pop() // phrases.txt
    return array.pop() // name of parent folder
  }


  function shutDown(reason) { 
    console.log(reason + "Quitting now")
    process.exit();
  }
})(process.argv)


function checkSource({ dbName, fileName, collection }) {
  fs.access(fileName, fs.F_OK, sourceFileExists)

  function sourceFileExists(error) {
    if (!error) {
      fs.readFile(fileName, 'utf8', parseFile);
    } else {
      shutDown(error);
    }
  }


  function parseFile(error, data) {
    if (error) {
      shutDown(error)
    } else {
      let array = convertToPhraseArray(data)
      console.log("Number of entries: " + array.length)
      addToMondoDB(dbName, collection, array)
    }
  }
}


/**
 * convertToPhraseArray takes a string with elements on separate
 * lines and converts it to an array of objects.
 *
 * @param  {string}  rawText is expected to be a string with a
 *                   format like:
 *                      
 *                   01
 *                   ru  Как вас зовут?
 *                   en  What is your f name?
 *                   fr  Quel est votre nom?
 *                   
 *                   02  Меня зовут...
 *                   en  My name is...
 *                   fr  Je m'appelle...
 *                   
 *                   03  Извините
 *                       Excuse f me
 *                   04  Как тебя зовут?
 *                   What is your inf name?
 *                   
 *                   05
 *                   У меня есть...
 *                   I have...
 *                   fr  J'ai
 *                   
 *                 > Each number starts a new entry. A string on
 *                 > line as a number is given the vo code by
 *                 > default. Any line with a string, but without
 *                 > a recognized code will be treated as the
 *                 > default translation, unless the string for
 *                 > the target language has not been defined yet,
 *                 > in which case, we'll assume that the target
 *                 > language was written first
 *                 >
 *                 > Entries which have an audio file number but
 *                 > not both a vo string and a default
 *                 > translation will be ignored.
 *                 
 * @return  {array}  Output is an array with the format:
 *          [ { _id:   "01"
 *            , audio: "01.mp3"
 *            , en:    "<p>What is your <sup>formal</sup> name?</p>"
 *            , fr:    "<p>Quel est votre nom?</p>"
 *            , index: 0
 *            , ru:    "<p>Как вас зовут?</p>"
 *            }
 *          , ... 
 *          ]            
 */ 
function convertToPhraseArray(rawText) {
  // Prepare a regex to detect either the file name|number or the
  // language code
  let idSeed = "_"
  let counter = 0
  let vo = "ru"
  let defaultCode = "en"
  let languageCodes = [ vo, defaultCode, "ru", "en", "fr" ]
  // Ensure there are no duplicates
  languageCodes = languageCodes.filter((code, index, array) => (
    array.indexOf(code) === index
  ))


  let chunkRegex = languageCodes.reduce((regex, code) => {
    return regex += `|^\\s*${code}`
  }, "\n*(\\d+") + ")\\s+"
  chunkRegex = new RegExp(chunkRegex)

  // console.log(chunkRegex)

  // Regex to break rawText up at numbered file names
  let phraseRegex = /(?:^|\n+)\s*(?=\d+\s+)/

  // Regex to break card data into languages
  let dataRegex = /\n+/
  let filter = item => item.trim() !== ""

  let cardArray = rawText.split(phraseRegex)
                         .filter(filter)
  let getHTML = (text) => {
    text = text.trim()
               .replace(" f ", "<sup>(formal)</sup> ")
               .replace(" inf ", "<sup>(informal)</sup> ")

    let index = text.indexOf("|")
    if (index < 0) {
    } else {
      let precision = text.substring(index + 1).trim()
      text = text.substring(0, index).trim()
           + `<span class="precision">${precision}<span>`
    }

    return "<p>" + text + "</p>"
  }


  // function getID() {
  //   let id = "" + counter++
  //   let zeros = Math.max(4 - id.length, 0)
  //   let padding = ""

  //   while (zeros--) {
  //     padding += "0"
  //   }

  //   return idSeed + padding + id
  // }


  let treatCard = (cardString, index) => {
    let cardData = {
      index: index
    // , _id: getID()
    }
    let languageChunks = cardString.split(dataRegex)
                                   .filter(filter)
    let addBits = chunk => {
      let bits = chunk.split(chunkRegex)
                      .filter(filter)
      // ["01"]
      // ["Как вас зовут?"]
      // ["What is your f name?"]
      // 
      // ["03", "Извините"]
      // ["en", "Excuse f me"]
      // ["fr", "Pardonnez-moi !"]

      let firstBit = bits[0].trim()

      if (bits.length > 1) {
        // ["XX", "text"]
        if (!isNaN(firstBit)) {
          // "XX" is a number = audio file; "text" is in Russian
          cardData._id = firstBit
          cardData.audio = firstBit + ".mp3"
          cardData[vo] = getHTML(bits[1])

        } else {
          // "XX" is a language code
          cardData[firstBit] = getHTML(bits[1])
        }

      } else {
        if (!isNaN(firstBit)) {
          // The audio file number is on its own line
          cardData._id = firstBit
          cardData.audio = firstBit + ".mp3"

        } else if (!cardData[vo]) {
          // The first unidentified string on a separate line
          // after the audio file number will be in the target
          // language
          cardData[vo] = getHTML(firstBit)
        } else {
          // The target language is already defined, so we'll 
          // assume this is the interface language
          cardData[defaultCode] = getHTML(firstBit)
        }
      }

      cardArray[index] = cardData
    }

    languageChunks.forEach(addBits)
  }

  cardArray.forEach(treatCard)  

  cardArray = cardArray.filter(cardData => 
    !!(cardData[vo] && cardData[defaultCode])
  )

  return cardArray
}


function addToMondoDB(dbName, collectionName, array) {
  // console.log(
  //   " dbName:    ", dbName + "\n"
  // , "collection:  ", collection + "\n"
  // , "array.length:", array.length)

  const length = array.length
  const sanctions = {
    useNewUrlParser: true
  , useUnifiedTopology: true
  }
  const client = new MongoClient(mongoURL, sanctions)

  // Use connect method to connect to the server
  client.connect(connectionCallback)

  function connectionCallback(error, result) {
    if (error) {
      shutDown(error)
    }

    console.log("Connected successfully to server")

    const db = client.db(dbName)
    const collection = db.collection(collectionName)
  
    collection.insertMany(array, insertCallback)

    function insertCallback(err, result) {
      console.log(result)

      assert.equal(err, null)
      assert.equal(length, result.result.n)
      assert.equal(length, result.ops.length)
      console.log(`Inserted ${length} documents into ${collection}`);
      client.close()
    }
  }
}


function shutDown(reason) { 
  console.log("\n<<< ERROR\n\n" 
    + "  " + reason
    + "\n  Quitting now\n\nERROR >>>")
  process.exit();
}