// Clase principal del juego Mario

function MarioGame() {
  var gameUI = GameUI.getInstance();

  var maxWidth; //ancho del mundo del juego
  var height;
  var viewPort; //ancho del lienzo, viewPort que se puede ver
  var tileSize;
  var map;
  var originalMaps;

  var translatedDist; //distancia traducida (desplazamiento lateral) mientras mario se mueve hacia la derecha
  var centerPos; //posición central del viewPort, pantalla visible
  var marioInGround;

  //instancias

  var mario;
  var element;
  var gameSound;
  var score;

  var keys = [];
  var goombas;
  var powerUps;
  var bullets;
  var bulletFlag = false;

  var currentLevel;

  var animationID;
  var timeOutId;

  var tickCounter = 0; //para animar a mario
  var maxTick = 25; //número máximo de ticks para mostrar el sprite de mario
  var instructionTick = 0; //mostrando contador de instrucciones
  var that = this;

  this.init = function(levelMaps, level) {
    height = 480;
    maxWidth = 0;
    viewPort = 1280;
    tileSize = 32;
    translatedDist = 0;
    goombas = [];
    powerUps = [];
    bullets = [];

    gameUI.setWidth(viewPort);
    gameUI.setHeight(height);
    gameUI.show();

    currentLevel = level;
    originalMaps = levelMaps;
    map = JSON.parse(levelMaps[currentLevel]);

    if (!score) {
     //para que cuando cambie de nivel utilice la misma instancia
      score = new Score();
      score.init();
    }
    score.displayScore();
    score.updateLevelNum(currentLevel);

    if (!mario) {
     //para que cuando cambie de nivel utilice la misma instancia
      mario = new Mario();
      mario.init();
    } else {
      mario.x = 10;
      mario.frame = 0;
    }
    element = new Element();
    gameSound = new GameSound();
    gameSound.init();

    that.calculateMaxWidth();
    that.bindKeyPress();
    that.startGame();
  };

  that.calculateMaxWidth = function() {
    //calcula el ancho máximo del juego según el tamaño del mapa
    for (var row = 0; row < map.length; row++) {
      for (var column = 0; column < map[row].length; column++) {
        if (maxWidth < map[row].length * 32) {
          maxWidth = map[column].length * 32;
        }
      }
    }
  };

  that.bindKeyPress = function() {
    var canvas = gameUI.getCanvas(); //para usar con eventos táctiles
    //clave de enlace
    document.body.addEventListener('keydown', function(e) {
      keys[e.keyCode] = true;
    });

    document.body.addEventListener('keyup', function(e) {
      keys[e.keyCode] = false;
    });

    // enlace de teclas para eventos táctiles
    canvas.addEventListener('touchstart', function(e) {
      var touches = e.changedTouches;
      e.preventDefault();

      for (var i = 0; i < touches.length; i++) {
        if (touches[i].pageX <= 200) {
          keys[37] = true; //flecha izquierda
        }
        if (touches[i].pageX > 200 && touches[i].pageX < 400) {
          keys[39] = true; //fleca derecha
        }
        if (touches[i].pageX > 640 && touches[i].pageX <= 1080) {
         //en eventos táctiles, la misma área actúa como sprint y tecla de disparo
          keys[16] = true; //shift key
          keys[17] = true; //ctrl key
        }
        if (touches[i].pageX > 1080 && touches[i].pageX < 1280) {
          keys[32] = true; //espacio
        }
      }
    });

    canvas.addEventListener('touchend', function(e) {
      var touches = e.changedTouches;
      e.preventDefault();

      for (var i = 0; i < touches.length; i++) {
        if (touches[i].pageX <= 200) {
          keys[37] = false;
        }
        if (touches[i].pageX > 200 && touches[i].pageX <= 640) {
          keys[39] = false;
        }
        if (touches[i].pageX > 640 && touches[i].pageX <= 1080) {
          keys[16] = false;
          keys[17] = false;
        }
        if (touches[i].pageX > 1080 && touches[i].pageX < 1280) {
          keys[32] = false;
        }
      }
    });

    canvas.addEventListener('touchmove', function(e) {
      var touches = e.changedTouches;
      e.preventDefault();

      for (var i = 0; i < touches.length; i++) {
        if (touches[i].pageX <= 200) {
          keys[37] = true;
          keys[39] = false;
        }
        if (touches[i].pageX > 200 && touches[i].pageX < 400) {
          keys[39] = true;
          keys[37] = false;
        }
        if (touches[i].pageX > 640 && touches[i].pageX <= 1080) {
          keys[16] = true;
          keys[32] = false;
        }
        if (touches[i].pageX > 1080 && touches[i].pageX < 1280) {
          keys[32] = true;
          keys[16] = false;
          keys[17] = false;
        }
      }
    });
  };

  //Bucle principal del juego
  this.startGame = function() {
    animationID = window.requestAnimationFrame(that.startGame);

    gameUI.clear(0, 0, maxWidth, height);

    if (instructionTick < 1000) {
      that.showInstructions(); //mostrando instrucciones de control de juego
      instructionTick++;
    }

    that.renderMap();

    for (var i = 0; i < powerUps.length; i++) {
      powerUps[i].draw();
      powerUps[i].update();
    }

    for (var i = 0; i < bullets.length; i++) {
      bullets[i].draw();
      bullets[i].update();
    }

    for (var i = 0; i < goombas.length; i++) {
      goombas[i].draw();
      goombas[i].update();
    }

    that.checkPowerUpMarioCollision();
    that.checkBulletEnemyCollision();
    that.checkEnemyMarioCollision();

    mario.draw();
    that.updateMario();
    that.wallCollision();
    marioInGround = mario.grounded; //para uso con bandera deslizante
  };

  this.showInstructions = function() {
    gameUI.writeText('Controles: Teclas de flecha para dirección, Mayús para ejecutar, Ctrl para bolas de fuego', 30, 30);
    gameUI.writeText('Tip: Saltar mientras corres te hace saltar más alto', 30, 60);
  };

  this.renderMap = function() {
    //estableciendo false cada vez que el mapa se representa para que los elementos caigan de una plataforma y no floten alrededor
    mario.grounded = false;

    for (var i = 0; i < powerUps.length; i++) {
      powerUps[i].grounded = false;
    }
    for (var i = 0; i < goombas.length; i++) {
      goombas[i].grounded = false;
    }

    for (var row = 0; row < map.length; row++) {
      for (var column = 0; column < map[row].length; column++) {
        switch (map[row][column]) {
          case 1: //plataforma
            element.x = column * tileSize;
            element.y = row * tileSize;
            element.platform();
            element.draw();

            that.checkElementMarioCollision(element, row, column);
            that.checkElementPowerUpCollision(element);
            that.checkElementEnemyCollision(element);
            that.checkElementBulletCollision(element);
            break;

          case 2: //cajaMonedas
            element.x = column * tileSize;
            element.y = row * tileSize;
            element.coinBox();
            element.draw();

            that.checkElementMarioCollision(element, row, column);
            that.checkElementPowerUpCollision(element);
            that.checkElementEnemyCollision(element);
            that.checkElementBulletCollision(element);
            break;

          case 3: //cajadePoder
            element.x = column * tileSize;
            element.y = row * tileSize;
            element.powerUpBox();
            element.draw();

            that.checkElementMarioCollision(element, row, column);
            that.checkElementPowerUpCollision(element);
            that.checkElementEnemyCollision(element);
            that.checkElementBulletCollision(element);
            break;

          case 4: //CajaVacia
            element.x = column * tileSize;
            element.y = row * tileSize;
            element.uselessBox();
            element.draw();

            that.checkElementMarioCollision(element, row, column);
            that.checkElementPowerUpCollision(element);
            that.checkElementEnemyCollision(element);
            that.checkElementBulletCollision(element);
            break;

          case 5: //tuboBandera
            element.x = column * tileSize;
            element.y = row * tileSize;
            element.flagPole();
            element.draw();

            that.checkElementMarioCollision(element, row, column);
            break;

          case 6: //bandera
            element.x = column * tileSize;
            element.y = row * tileSize;
            element.flag();
            element.draw();
            break;

          case 7: //tuboIzquierda
            element.x = column * tileSize;
            element.y = row * tileSize;
            element.pipeLeft();
            element.draw();

            that.checkElementMarioCollision(element, row, column);
            that.checkElementPowerUpCollision(element);
            that.checkElementEnemyCollision(element);
            that.checkElementBulletCollision(element);
            break;

          case 8: //tuboDerecha
            element.x = column * tileSize;
            element.y = row * tileSize;
            element.pipeRight();
            element.draw();

            that.checkElementMarioCollision(element, row, column);
            that.checkElementPowerUpCollision(element);
            that.checkElementEnemyCollision(element);
            that.checkElementBulletCollision(element);
            break;

          case 9: //tuboArribaIzquierda
            element.x = column * tileSize;
            element.y = row * tileSize;
            element.pipeTopLeft();
            element.draw();

            that.checkElementMarioCollision(element, row, column);
            that.checkElementPowerUpCollision(element);
            that.checkElementEnemyCollision(element);
            that.checkElementBulletCollision(element);
            break;

          case 10: //tuberíaArribaDerecha
            element.x = column * tileSize;
            element.y = row * tileSize;
            element.pipeTopRight();
            element.draw();

            that.checkElementMarioCollision(element, row, column);
            that.checkElementPowerUpCollision(element);
            that.checkElementEnemyCollision(element);
            that.checkElementBulletCollision(element);
            break;

          case 20: //goomba
            var enemy = new Enemy();
            enemy.x = column * tileSize;
            enemy.y = row * tileSize;
            enemy.goomba();
            enemy.draw();

            goombas.push(enemy);
            map[row][column] = 0;
        }
      }
    }
  };

  this.collisionCheck = function(objA, objB) {
    // obtener los vectores para comparar
    var vX = objA.x + objA.width / 2 - (objB.x + objB.width / 2);
    var vY = objA.y + objA.height / 2 - (objB.y + objB.height / 2);

    // sumamos la mitad del ancho y la mitad de la altura de los objetos
    var hWidths = objA.width / 2 + objB.width / 2;
    var hHeights = objA.height / 2 + objB.height / 2;
    var collisionDirection = null;

// si los vectores x e y son menores que la mitad del ancho o la mitad del alto, entonces debemos estar dentro del objeto, provocando una colisión    
    if (Math.abs(vX) < hWidths && Math.abs(vY) < hHeights) {
      // descubre de qué lado estamos chocando (arriba, abajo, izquierda o derecha)
      var offsetX = hWidths - Math.abs(vX);
      var offsetY = hHeights - Math.abs(vY);

      if (offsetX >= offsetY) {
        if (vY > 0 && vY < 37) {
          collisionDirection = 't';
          if (objB.type != 5) {
           //si el asta de la bandera pasa a través de ella
            objA.y += offsetY;
          }
        } else if (vY < 0) {
          collisionDirection = 'b';
          if (objB.type != 5) {
            //si el asta de la bandera pasa a través de ella
            objA.y -= offsetY;
          }
        }
      } else {
        if (vX > 0) {
          collisionDirection = 'l';
          objA.x += offsetX;
        } else {
          collisionDirection = 'r';
          objA.x -= offsetX;
        }
      }
    }
    return collisionDirection;
  };

  this.checkElementMarioCollision = function(element, row, column) {
    var collisionDirection = that.collisionCheck(mario, element);

    if (collisionDirection == 'l' || collisionDirection == 'r') {
      mario.velX = 0;
      mario.jumping = false;

      if (element.type == 5) {
        // asta de bandera
        that.levelFinish(collisionDirection);
      }
    } else if (collisionDirection == 'b') {
      if (element.type != 5) {
        //solo si no es un asta de bandera
        mario.grounded = true;
        mario.jumping = false;
      }
    } else if (collisionDirection == 't') {
      if (element.type != 5) {
        mario.velY *= -1;
      }

      if (element.type == 3) {
        //Caja de encendido
        var powerUp = new PowerUp();

        //da hongo si mario es pequeño, sino da flor
        if (mario.type == 'small') {
          powerUp.mushroom(element.x, element.y);
          powerUps.push(powerUp);
        } else {
          powerUp.flower(element.x, element.y);
          powerUps.push(powerUp);
        }

        map[row][column] = 4; 
        //se establece en un cuadro inútil después de que aparece powerUp

        //sonido cuando aparece el hongo
        gameSound.play('powerUpAppear');
      }

      if (element.type == 11) {
        //Caja de flores
        var powerUp = new PowerUp();
        powerUp.flower(element.x, element.y);
        powerUps.push(powerUp);

        map[row][column] = 4; 
        //se establece en un cuadro inútil después de que aparece powerUp

          //sonido cuando aparece la flor
        gameSound.play('powerUpAppear');
      }

      if (element.type == 2) {
        //Caja de Monedas
        score.coinScore++;
        score.totalScore += 100;

        score.updateCoinScore();
        score.updateTotalScore();
        map[row][column] = 4; 
        //se establece en una casilla inútil después de que aparece la moneda

        //suena cuando se golpea el bloque de monedas
        gameSound.play('coin');
      }
    }
  };

  this.checkElementPowerUpCollision = function(element) {
    for (var i = 0; i < powerUps.length; i++) {
      var collisionDirection = that.collisionCheck(powerUps[i], element);

      if (collisionDirection == 'l' || collisionDirection == 'r') {
        powerUps[i].velX *= -1; //cambia de dirección si colisiona con cualquier elemento del si
      } else if (collisionDirection == 'b') {
        powerUps[i].grounded = true;
      }
    }
  };

  this.checkElementEnemyCollision = function(element) {
    for (var i = 0; i < goombas.length; i++) {
      if (goombas[i].state != 'deadFromBullet') {
        //para que los goombas caigan del mapa cuando mueran por una bala
        var collisionDirection = that.collisionCheck(goombas[i], element);

        if (collisionDirection == 'l' || collisionDirection == 'r') {
          goombas[i].velX *= -1;
        } else if (collisionDirection == 'b') {
          goombas[i].grounded = true;
        }
      }
    }
  };

  this.checkElementBulletCollision = function(element) {
    for (var i = 0; i < bullets.length; i++) {
      var collisionDirection = that.collisionCheck(bullets[i], element);

      if (collisionDirection == 'b') {
        //si la colisión es desde la parte inferior de la bala, ésta se aterriza para que pueda rebotar
        bullets[i].grounded = true;
      } else if (collisionDirection == 't' || collisionDirection == 'l' || collisionDirection == 'r') {
        bullets.splice(i, 1);
      }
    }
  };

  this.checkPowerUpMarioCollision = function() {
    for (var i = 0; i < powerUps.length; i++) {
      var collWithMario = that.collisionCheck(powerUps[i], mario);
      if (collWithMario) {
        if (powerUps[i].type == 30 && mario.type == 'small') {
          //Hoongo
          mario.type = 'big';
        } else if (powerUps[i].type == 31) {
          //flor
          mario.type = 'fire';
        }
        powerUps.splice(i, 1);

        score.totalScore += 1000;
        score.updateTotalScore();

        //sonido del hongo apretado
        gameSound.play('powerUp');
      }
    }
  };

  this.checkEnemyMarioCollision = function() {
    for (var i = 0; i < goombas.length; i++) {
      if (!mario.invulnerable && goombas[i].state != 'dead' && goombas[i].state != 'deadFromBullet') {
       //si mario es invulnerable o el estado de goombas está muerto, la colisión no ocurre
        var collWithMario = that.collisionCheck(goombas[i], mario);

        if (collWithMario == 't') {
          // Mata a las goombas si la colisión es desde arriba
          goombas[i].state = 'dead';

          mario.velY = -mario.speed;

          score.totalScore += 1000;
          score.updateTotalScore();

          //sonido cuando el enemigo muere
          gameSound.play('killEnemy');
        } else if (collWithMario == 'r' || collWithMario == 'l' || collWithMario == 'b') {
          goombas[i].velX *= -1;

          if (mario.type == 'big') {
            mario.type = 'small';
            mario.invulnerable = true;
            collWithMario = undefined;

           //sonido cuando mario powerDowns
            gameSound.play('powerDown');

            setTimeout(function() {
              mario.invulnerable = false;
            }, 1000);
          } else if (mario.type == 'fire') {
            mario.type = 'big';
            mario.invulnerable = true;

            collWithMario = undefined;

            //sonido cuando mario powerDowns
            gameSound.play('powerDown');

            setTimeout(function() {
              mario.invulnerable = false;
            }, 1000);
          } else if (mario.type == 'small') {
            //mata a mario si ocurre una colisión cuando es pequeño
            that.pauseGame();

            mario.frame = 13;
            collWithMario = undefined;

            score.lifeCount--;
            score.updateLifeCount();

            //sonido cuando mario muere
            gameSound.play('marioDie');

            timeOutId = setTimeout(function() {
              if (score.lifeCount == 0) {
                that.gameOver();
              } else {
                that.resetGame();
              }
            }, 3000);
            break;
          }
        }
      }
    }
  };

  this.checkBulletEnemyCollision = function() {
    for (var i = 0; i < goombas.length; i++) {
      for (var j = 0; j < bullets.length; j++) {
        if (goombas[i] && goombas[i].state != 'dead') {
          //comprobar colisión sólo si existen goombas y no están muertos
          var collWithBullet = that.collisionCheck(goombas[i], bullets[j]);
        }

        if (collWithBullet) {
          bullets[j] = null;
          bullets.splice(j, 1);

          goombas[i].state = 'deadFromBullet';

          score.totalScore += 1000;
          score.updateTotalScore();

         // suena cuando muere el enemigo
          gameSound.play('killEnemy');
        }
      }
    }
  };

  this.wallCollision = function() {
    //para paredes (paredes vistaport)
    if (mario.x >= maxWidth - mario.width) {
      mario.x = maxWidth - mario.width;
    } else if (mario.x <= translatedDist) {
      mario.x = translatedDist + 1;
    }

    //para terreno (terreno de ventana gráfica)
    if (mario.y >= height) {
      that.pauseGame();

      //sonido cuando mario muere
      gameSound.play('marioDie');

      score.lifeCount--;
      score.updateLifeCount();

      timeOutId = setTimeout(function() {
        if (score.lifeCount == 0) {
          that.gameOver();
        } else {
          that.resetGame();
        }
      }, 3000);
    }
  };

  //controlando a mario con eventos clave
  this.updateMario = function() {
    var friction = 0.9;
    var gravity = 0.2;

    mario.checkMarioType();

    if (keys[38] || keys[32]) {
      //flecha arriba
      if (!mario.jumping && mario.grounded) {
        mario.jumping = true;
        mario.grounded = false;
        mario.velY = -(mario.speed / 2 + 5.5);

        // posición del sprite de mario
        if (mario.frame == 0 || mario.frame == 1) {
          mario.frame = 3; //salto a la derecha
        } else if (mario.frame == 8 || mario.frame == 9) {
          mario.frame = 2; //salto a la izquierda
        }

       //sonido cuando mario salta
        gameSound.play('jump');
      }
    }

    if (keys[39]) {
      //flecha correcta
      that.checkMarioPos(); //si mario va al centro de la pantalla, desplaza el mapa lateralmente

      if (mario.velX < mario.speed) {
        mario.velX++;
      }

      //posición del sprite de mario
      if (!mario.jumping) {
        tickCounter += 1;

        if (tickCounter > maxTick / mario.speed) {
          tickCounter = 0;

          if (mario.frame != 1) {
            mario.frame = 1;
          } else {
            mario.frame = 0;
          }
        }
      }
    }

    if (keys[37]) {
     //flecha izquierda
      if (mario.velX > -mario.speed) {
        mario.velX--;
      }

     //posición del sprite de mario
      if (!mario.jumping) {
        tickCounter += 1;

        if (tickCounter > maxTick / mario.speed) {
          tickCounter = 0;

          if (mario.frame != 9) {
            mario.frame = 9;
          } else {
            mario.frame = 8;
          }
        }
      }
    }

    if (keys[16]) {
      //tecla Shift
      mario.speed = 4.5;
    } else {
      mario.speed = 3;
    }

    if (keys[17] && mario.type == 'fire') {
      //Tecla ctrl
      if (!bulletFlag) {
        bulletFlag = true;
        var bullet = new Bullet();
        if (mario.frame == 9 || mario.frame == 8 || mario.frame == 2) {
          var direction = -1;
        } else {
          var direction = 1;
        }
        bullet.init(mario.x, mario.y, direction);
        bullets.push(bullet);

        //sonido de bala
        gameSound.play('bullet');

        setTimeout(function() {
          bulletFlag = false; //sólo permite que mario dispare una bala después de 500ms
        }, 500);
      }
    }

    //velocidad 0 posición del sprite
    if (mario.velX > 0 && mario.velX < 1 && !mario.jumping) {
      mario.frame = 0;
    } else if (mario.velX > -1 && mario.velX < 0 && !mario.jumping) {
      mario.frame = 8;
    }

    if (mario.grounded) {
      mario.velY = 0;

      //posición del sprite conectado a tierra
      if (mario.frame == 3) {
        mario.frame = 0; //mirando hacia la derecha
      } else if (mario.frame == 2) {
        mario.frame = 8; //mirando a la izquierda
      }
    }

    //cambiar la posición de mario
    mario.velX *= friction;
    mario.velY += gravity;

    mario.x += mario.velX;
    mario.y += mario.velY;
  };

  this.checkMarioPos = function() {
    centerPos = translatedDist + viewPort / 2;

    //desplazamiento lateral cuando mario llega al centro del viewPort
    if (mario.x > centerPos && centerPos + viewPort / 2 < maxWidth) {
      gameUI.scrollWindow(-mario.speed, 0);
      translatedDist += mario.speed;
    }
  };

  this.levelFinish = function(collisionDirection) {
    //el juego termina cuando mario desliza el asta de la bandera y choca con el suelo
    if (collisionDirection == 'r') {
      mario.x += 10;
      mario.velY = 2;
      mario.frame = 11;
    } else if (collisionDirection == 'l') {
      mario.x -= 32;
      mario.velY = 2;
      mario.frame = 10;
    }

    if (marioInGround) {
      mario.x += 20;
      mario.frame = 10;
      tickCounter += 1;
      if (tickCounter > maxTick) {
        that.pauseGame();

        mario.x += 10;
        tickCounter = 0;
        mario.frame = 12;

       //sonido cuando el escenario se aclara
        gameSound.play('stageClear');

        timeOutId = setTimeout(function() {
          currentLevel++;
          if (originalMaps[currentLevel]) {
            that.init(originalMaps, currentLevel);
            score.updateLevelNum(currentLevel);
          } else {
            that.gameOver();
          }
        }, 5000);
      }
    }
  };

  this.pauseGame = function() {
    window.cancelAnimationFrame(animationID);
  };

  this.gameOver = function() {
    score.gameOverView();
    gameUI.makeBox(0, 0, maxWidth, height);
    gameUI.writeText('Game Over', centerPos - 80, height - 300);
    gameUI.writeText('Gracias por jugar', centerPos - 122, height / 2);
  };

  this.resetGame = function() {
    that.clearInstances();
    that.init(originalMaps, currentLevel);
  };

  this.clearInstances = function() {
    mario = null;
    element = null;
    gameSound = null;

    goombas = [];
    bullets = [];
    powerUps = [];
  };

  this.clearTimeOut = function() {
    clearTimeout(timeOutId);
  };

  this.removeGameScreen = function() {
    gameUI.hide();

    if (score) {
      score.hideScore();
    }
  };

  this.showGameScreen = function() {
    gameUI.show();
  };
}
