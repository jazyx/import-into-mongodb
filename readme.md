# Import into MongoDB

## Purpose
Imports a plain text file with contents like:

``` 
01
ru  Как вас зовут?
en  What is your f name?
fr  Quel est votre nom?

02  Меня зовут...
en  My name is...
fr  Je m'appelle...

03  Извините
    Excuse f me
04  Как тебя зовут?
What is your inf name?

05
У меня есть...
I have...
fr  J'ai
```

Each number starts a new entry. A string on line as a number is given the code "ru" by default. Any line with a string, but without a recognized code will be treated as the default translation, unless the string for the target language has not been defined yet, in which case, we'll assume that the target language was written first

Entries which have an audio file number but not both a vo string and a default translation will be ignored.

## Use

Call 
```
node app.js <fileName> <dbName>
```

* dbName is optional. "flashcards" will be used by default
* fileName must be the absolute path to a file with the format described above.

## Effect

The name of the folder containing the imported file will be used as the name of the MongoDB collection into which the contents of the file will be imported.

For each entry in the imported file, a document will be created in the MongoDB database, with a format like:
```
{ _id: <the name of the audio file, minus the extension>
, audio: "01.mp3"
, en: "<p>What is your <sup>formal</sup> name?</p>"
, fr: "<p>Quel est votre nom?</p>"
, index: 0
, ru: "<p>Как вас зовут?</p>"
}
```

