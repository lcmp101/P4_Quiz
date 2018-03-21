
const Sequelize = require('sequelize');

const {models} = require('./model');

const {log, biglog, errorlog, colorize} = require("./out");


/**
 * Muestra la ayuda.
 */
exports.helpCmd = (socket, rl) => {
  log(socket, "Comandos:");
  log(socket, " h|help - Muestra esta ayuda.");
  log(socket, " list - Listar los quizzes existentes.");
  log(socket, " show <id> - Muestra la pregunta y la respuesta el quiz indicado.");
  log(socket, " add - Añadir un nuevo quiz interactivamente.");
  log(socket, " delete <id> - Borrar el quiz indicado.");
  log(socket, " edit <id> - Editar el quiz indicado.");
  log(socket, " test <id> - Probar el quiz indicado.");
  log(socket, " p|play - Jugar a preguntar aleatoriamente todos los quizzes.");
  log(socket, " credits - Créditos.");
  log(socket, " q|quit - Salir del programa.");
  rl.prompt();
};


/**
 * Lista todos los quizzes existentes en el modelo.
 */
exports.listCmd = (socket, rl) => {
  //log('Listar todos los quizzes existentes.', 'red');
  models.quiz.findAll()
  .each(quiz => {
    log(socket, ` [${colorize(quiz.id, 'magenta')}]: ${quiz.question} `);
  })
  .catch(error => {
    errorlog(socket, error.message);
  })
  .then(() => {
    rl.prompt();
  });
};


/**
 * Esta funcion devuelve una promesa que:
 *  - Valida que se ha introducido un valor para el parametro.
 *  - Convierte el parametro en un numero entero.
 * Si todo va bien, la promesa se satisface y devuelve el valor de id a usar.
 * 
 * @param id Parametro con el indice a validar.
 */
const validateId = id => {
  return new Sequelize.Promise((resolve, reject) => {
    if(typeof id === "undefined") {
      reject(new Error(` Falta el parametro <id>. `));
    } else {
      id =parseInt(id); // coger la parte entera y descartar lo demas
      if(Number.isNaN(id)) {
        reject(new Error(` El valor del parametro <id> no es un número. `));
      } else {
        resolve(id);
      }
    }
  });
};


/**
 * Muestra el quiz indicado en el parámetro: la pregunta y la respuesta.
 * 
 * @param id Clave del quiz a mostrar.
 */
exports.showCmd = (socket, rl, id) => {
   //log('Mostrar el quiz indicado.', 'red');
   validateId(id)
   .then(id => models.quiz.findById(id))
   .then(quiz => {
     if (!quiz) {
       throw new Error(`No esiste un quiz asociado al id=${id}. `);
     }
     log(socket, ` [${colorize(quiz.id, 'magenta')}]: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
   })
   .catch(error =>{
     errorlog(socket, error.message);
   })
   .then(() => {
     rl.prompt();
   });
};
 
 
 /**
  * Esta funcion devuelve una promesa que cuando se cumple, proporciona el texto introducido.
  * Entonces la llamada a then que hay que hacer la promesa devuelta sera:
  *     .then(answer => {...})
  * 
  * Tambien colorea en rojo el texto de la pregunta, elimina espacios al principio y final.
  * 
  * @param rl Objeto readline usado para implentar el CLI.
  * @param text Pregunta que hay que hacerle al usuario.
  */
const makeQuestion = (rl, text) => {
  return new Sequelize.Promise((resolve, reject) => {
    rl.question(colorize(text, 'red'), answer => {
      resolve(answer.trim());
    });
  });
};
 
 
 /**
  * Añade un nuevo quiz al módelo.
  * Pregunta interactivamente por la pregunta y por la respuesta.
  * 
  * Hay que recordar que el funcionamiento de la funcion rl.question es asíncrono.
  * El prompt hay que sacarlo cuando ya se ha terminado la interacción con el usuario,
  * la llamada a rl.prompt() se debe hacer en la callback de la segunda llamada a rl.question
  * 
  * @param rl Objeto readline usado para implentar el CLI.
  */
exports.addCmd = (socket, rl) => {
  //log('Añadir un nuevo quiz', 'red');
  makeQuestion(rl, ' Introduzca una pregunta: ')
  .then(g => {
    return makeQuestion(rl, ' Introduzca la respuesta ')
    .then(a => {
      return {question: g, answer: a};
    });
  })
  .then(quiz => {
    return models.quiz.create(quiz);
  })
  .then((quiz) => {
    log(socket, ` [${colorize(quiz.id, 'magenta')}]: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
  })
  .catch(Sequelize.ValidateError, error => {
    errorlog(socket, 'El quiz es erroneo:');
    error.errors.forEach(({message}) => errorlog(message));
  })
  .catch(error => {
    errorlog(socket, error.message);
  })
  .then(() => {
    rl.prompt();
  });
};


/**
 * Borra un quiz del modelo.
 * 
 * @param id Clave del quiz a borrar en el modelo.
 */
exports.deleteCmd = (socket, rl, id) => {
 // log('Borrar el quiz indicado.', 'red');
 validateId(id)
 .then(id => models.quiz.destroy({where: {id}}))
 .catch(error => {
   errorlog(socket, error.message);
 })
 .then(() => {
  rl.prompt();
 });
};


/**
 * Edita un quiz del modelo.
 * 
 * @param id Clave del quiz a editar en el modelo.
 */
exports.editCmd = (socket, rl, id) => {
  //log('Editar el quiz indicado.', 'red');
 validateId(id)
        .then(id => models.quiz.findById(id))
        .then(quiz => {
             if (!quiz) {
                throw new Error(`No existe un quiz asociado al id=${id}.`);
             }
        
             process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)},0);
             return makeQuestion(rl, ' Introduzca una pregunta: ')
             .then(q => {
                 process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)},0);
                 return makeQuestion(rl, ' Introduzca la respuesta: ')
                 .then(a => {
                      
                          quiz.question = q;
                          quiz.answer = a;
                          return quiz;
                  });
              });
        })
       .then(quiz => {
             return quiz.save();
        })
       .then(quiz => {
            log(socket, ` Se ha cambiado el quiz ${colorize(quiz.id, 'magenta')} por: ${quiz.question} ${colorize(' => ', 'magenta')} ${quiz.answer}`);
             
        })
       .catch(Sequelize.ValidationError, error => {
             errorlog(socket, 'El quiz es erroneo:');
             error.errors.forEach(({message}) => errorlog(message));
        })
       .catch(error => {
            errorlog(socket, error.message);
        })
       .then(() => {
            rl.prompt();
  });
};


/**
 * Prueba un quiz, es decir, hace una pregunta del modelo a la que debemos contestar.
 * 
 * @param id Clave del quiz a probar.
 */
exports.testCmd = (socket, rl, id) => {
  //log('Probar el quiz indicado.', 'red');
  validateId(id)
        .then(id => models.quiz.findById(id))
        .then(quiz=>{
            if(!quiz){
                throw  new Error(`No existe un quiz asociado al id=${id}.`)
            }
            return makeQuestion(rl,`${quiz.question} ? `)
                .then(a => {
                    let respuesta = a.trim().toLowerCase()
                    let resp  =quiz.answer;
                    if(respuesta !== resp.trim().toLowerCase()) {
                        log(socket, 'Su respuesta es incorrecta.'),
                            biglog(socket, "Incorrecta", "red")
                    }else {
                        return log(socket, 'Su respuesta es correcta.'),
                            biglog(socket, "Correcta", "green")
                    }
                });
        })
        .catch(error=>{
                 errorlog(socket, error.message);
        })
        .then(()=>{
           rl.prompt();
  });
};


/**
 * Pregunta todos los quizzes existentes en el modelo en orden aleatorio.
 * Se gana si se contesta a todos satisfactoriamente.
 */
 exports.playCmd = (socket, rl) => {
   //log('Jugar.', 'red');
  var cntdr = 1;
	var toBeResolved = [];
	var score = 0;
	models.quiz.findAll()
    .each(quiz => {
		toBeResolved[cntdr-1] = cntdr;
		cntdr = cntdr +1 ;
    })
    .then(() => {
	    const playOne = ()=> {
			if ( toBeResolved.length === 0){
				log(socket, "No hay más preguntas.");
				log(socket, `Fin del juego. Aciertos: ${score}`),
				biglog(socket, score, 'magenta');
				rl.prompt();
			}else{
				let rand = Math.trunc(Math.random()*toBeResolved.length);
				let id = toBeResolved[rand];
				validateId(id)
				.then(id => models.quiz.findById(id))
				.then(quiz => {
					pregunta = quiz.question;
					makeQuestion(rl, pregunta + '?')
					.then(a => {
						console.log(a);
						if ( a.toLocaleLowerCase() === quiz.answer.toLocaleLowerCase()){
							score++;
							log(socket, "CORRECTO");
							log(socket, `Lleva ${score} aciertos.`);
							toBeResolved.splice(rand,1);
							playOne();
						}else{
							log(socket, "INCORRECTO");
							log(socket, 'Fin del juego.');
							log(socket, `Aciertos: ${score}`);
							biglog(socket, score,'magenta');
							rl.prompt();
						}
					});
				})
				.catch(error => {
					errorlog(socket, error.message);
				})
				.then(() => {
					rl.prompt();
				});
			}
	    };
	    playOne();
    });    
};
 
 
 /**
  * Muestra los nombres de los autores de la práctica.
  */
exports.creditsCmd = (socket, rl) => {
  log(socket, 'Autores de la práctica:');
  log(socket, 'Lucia Martin Perez', 'green');
  log(socket, 'Olga Rico Diez', 'green');
  rl.prompt();
};


/**
 * Terminar el programa.
 */
exports.quitCmd = (socket, rl) => {
  rl.close();
  socket.end();
};

