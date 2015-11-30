/**
 * This is the server app script that is run on the server.
 * @author Alvin Lin (alvin.lin.dev@gmail.com)
 */

// Constants
var CHAT_TAG = '[Browsercraft]';
var DEV_MODE = false;
var FRAME_RATE = 1000.0 / 60.0;
var IP = process.env.IP || 'localhost';
var PORT_NUMBER = process.env.PORT || 5000;

// Sets the DEV_MODE constant during development if we run 'node server --dev'
process.argv.forEach(function(value, index, array) {
  if (value == '--dev' || value == '--development') {
    DEV_MODE = true;
  }
});

// Dependencies.
var assert = require('assert');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var express = require('express');
var http = require('http');
var morgan = require('morgan');
var session = require('express-session');
var socketIO = require('socket.io');
var swig = require('swig');
var mongodb = require('mongodb');

var AccountManager = require('./server/AccountManager');
var GameManager = require('./server/GameManager');
var LobbyManager = require('./server/LobbyManager');
var SessionManager = require('./server/SessionManager');

// Initialization.
var app = express();
var server = http.Server(app);
var io = socketIO(server);
var accountManager = AccountManager.create();
var lobbyManager = LobbyManager.create();
var sessionManager = SessionManager.create();

app.engine('html', swig.renderFile);

app.set('port', PORT_NUMBER);
app.set('view engine', 'html');

app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: false
}));
app.use(morgan(':date[web] :method :url :req[header] :remote-addr :status'));
app.use('/bower_components',
        express.static(__dirname + '/bower_components'));
app.use('/static',
        express.static(__dirname + '/static'));
app.use('/shared',
        express.static(__dirname + '/shared'));
// Use request.query for GET request params.
// Use request.body for POST request params.
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Routing
app.get('/', function(request, response) {
  response.render('index.html', {
    dev_mode: DEV_MODE,
    username: request.session.username
  });
});

app.get('/register', function(request, response) {
  response.redirect('/');
});

app.post('/register', function(request, response) {
  var username = request.body.username;
  var password = request.body.password;
  var confirmPassword = request.body.confirmPassword;

  if (request.session.username) {
    response.render('index.html', {
      dev_mode: DEV_MODE,
      message: 'You must log out in order to register a user.',
      username: request.session.username
    });
    return;
  }
  if (!AccountManager.isValidUsername(username)) {
    response.render('index.html', {
      dev_mode: DEV_MODE,
      message: 'Invalid username.',
    });
    return;
  }
  if (!AccountManager.isValidPassword(password)) {
    response.render('index.html', {
      dev_mode: DEV_MODE,
      message: 'Your password is too short.',
    });
    return;
  }
  if (password != confirmPassword) {
    response.render('index.html', {
      dev_mode: DEV_MODE,
      message: 'Your passwords do not match!'
    });
    return;
  }
  accountManager.registerUser(username, password, function(result) {
    if (result) {
      request.session.username = username;
      response.render('index.html', {
        dev_mode: DEV_MODE,
        message: 'Successfully registered.',
        username: request.session.username
      });
    } else {
      response.render('index.html', {
        dev_mode: DEV_MODE,
        message: 'Your username is taken.'
      });
    }
  });
});

app.get('/login', function(request, response) {
  response.redirect('/');
});

app.post('/login', function(request, response) {
  var username = request.body.username;
  var password = request.body.password;

  if (request.session.username) {
    response.render('index.html', {
      dev_mode: DEV_MODE,
      message: 'You are already logged in.',
      username: request.session.username
    });
  }
  accountManager.isUserAuthenticated(username, password, function(status) {
    if (status) {
      request.session.username = username;
      response.render('index.html', {
        dev_mode: DEV_MODE,
        username: request.session.username
      });
    } else {
      response.render('index.html', {
        dev_mode: DEV_MODE,
        message: 'Invalid credentials.'
      });
    }
  });
});

app.get('/logout', function(request, response) {
  request.session.username = null;
  response.redirect('/');
});

app.post('/logout', function(request, response) {
  request.session.username = null;
  response.redirect('/');
});

// Server side input handler, modifies the state of the players and the
// game based on the input it receives. Everything runs asynchronously with
// the game loop.
io.on('connection', function(socket) {
  // When a new player joins, the server adds a new player to the game.
  socket.on('new-player', function(data) {
    game.addNewPlayer(data.name, socket);
    socket.emit('received-new-player');
  });

  // Update the internal object states every time a player sends an intent
  // packet.
  socket.on('player-action', function(data) {
    game.updatePlayerOnInput(socket.id, data.keyboardState, data.orientation,
                             data.shot, data.build, data.timestamp);
  });

  socket.on('chat-client-to-server', function(data) {
    io.sockets.emit('chat-server-to-clients', {
      name: game.getPlayerNameBySocketId(socket.id),
      message: data
    });
  });

  // When a player disconnects, remove them from the game.
  socket.on('disconnect', function() {
  });
});

// Server side game loop, runs at 60Hz and sends out update packets to all
// clients every tick.
setInterval(function() {
//  game.update();
//  game.sendState();

}, FRAME_RATE);

// Starts the server.
server.listen(PORT_NUMBER, function() {
  console.log('STARTING SERVER ON PORT ' + PORT_NUMBER);
  accountManager.init();
  if (DEV_MODE) {
    console.log('DEVELOPMENT MODE ENABLED: SERVING UNCOMPILED JAVASCRIPT!');
  }
});