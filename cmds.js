const model = require('./model');

const {log, biglog, errorlog, colorize} = require("./out");


/**
 * Muestra la ayuda.
 */
exports.helpCmd = rl => {
  log("Comandos:");
  log(" h|help - Muestra esta ayuda.");
  log(" list - Listar los quizzes existentes.");
  log(" show <id> - Muestra la pregunta y la respuesta el quiz indicado.");
  log(" add - Añadir un nuevo quiz interactivamente.");
  log(" delete <id> - Borrar el quiz indicado.");
  log(" edit <id> - Editar el quiz indicado.");
  log(" test <id> - Probar el quiz indicado.");
  log(" p|play - Jugar a preguntar aleatoriamente todos los quizzes.");
  log(" credits - Créditos.");
  log(" q|quit - Salir del programa.");
  rl.prompt();
};


/**
 * Lista todos los quizzes existentes en el modelo.
 */
exports.listCmd = rl => {
  //log('Listar todos los quizzes existentes.', 'red');
  model.getAll().forEach((quiz, id) => {
    log(` [${colorize(id, 'magenta')}]: ${quiz.question} `);
  });
  rl.prompt();
}


/**
 * Muestra el quiz indicado en el parámetro: la pregunta y la respuesta.
 * 
 * @param id Clave del quiz a mostrar.
 */
exports.showCmd = (rl, id) => {
   //log('Mostrar el quiz indicado.', 'red');
   if (typeof id === "undefined") {
     errorlog(`Falta el parámetro id.`);
   } else{
     try{
       const quiz = model.getByIndex(id);
       log(` [${colorize(id, 'magenta')}]: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
     } catch(error) {
       errorlog(error.message);
     }
   }
   rl.prompt();
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
exports.addCmd = rl => {
  //log('Añadir un nuevo quiz', 'red');
  rl.question(colorize(' Introduzca una pregunta: ', 'red'), question => {
    rl.question(colorize( 'Introduzca la respuesta ', 'red'), answer => {
      model.add(question, answer);
      log(`${colorize('Se ha añadido', 'magenta')}: ${question} ${colorize('=>', 'magenta')} ${answer}`);
      rl.prompt();
    });
  });
};


/**
 * Borra un quiz del modelo.
 * 
 * @param id Clave del quiz a borrar en el modelo.
 */
exports.deleteCmd = (rl, id) => {
 // log('Borrar el quiz indicado.', 'red');
 if (typeof id === "undefined") {
     errorlog(`Falta el parámetro id.`);
   } else{
     try{
       model.deleteByIndex(id);
     } catch(error) {
       errorlog(error.message);
     }
   }
  rl.prompt();
}


/**
 * Edita un quiz del modelo.
 * 
 * @param id Clave del quiz a editar en el modelo.
 */
exports.editCmd = (rl, id) => {
  //log('Editar el quiz indicado.', 'red');
  if (typeof id === "undefined") {
     errorlog(`Falta el parámetro id.`);
   } else{
     try{
        const quiz = model.getByIndex(id);
         
        process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)}, 0);
         
        rl.question(colorize(' Introduzca una pregunta: ', 'red'), question => {
          
          process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)}, 0);
         
          rl.question(colorize( 'Introduzca la respuesta ', 'red'), answer => {
            model.update(id, question, answer);
            log(` Se ha cambiado el quiz ${colorize(id, 'magenta')} por: ${question} ${colorize('=>', 'magenta')} ${answer} `);
          rl.prompt();
        });
      });
     } catch(error) {
       errorlog(error.message);
       rl.prompt();
     }
   }
};


/**
 * Prueba un quiz, es decir, hace una pregunta del modelo a la que debemos contestar.
 * 
 * @param id Clave del quiz a probar.
 */
exports.testCmd = (rl, id) => {
  //log('Probar el quiz indicado.', 'red');
  if (typeof id === "undefined") {
	  errorlog(`Falta el parámetro id.`);
		rl.prompt();
	} else {
		try{
			const quiz = model.getByIndex(id);
			rl.question(colorize(quiz.question+"? ", 'red'), answer => {
				if (quiz.answer.toLowerCase().trim() === answer.toLowerCase().trim()){
					log("La respuesta es correcta.", 'green');
					biglog('CORRECTO', 'green');
					rl.prompt();
				} else{
					log("La respuesta es incorrecta.", 'red');
					biglog('INCORRECTO', 'red');
					rl.prompt();
				}
			});
		} catch(error) {
			errorlog(error.message);
			rl.prompt();
		}
	}	
};


/**
 * Pregunta todos los quizzes existentes en el modelo en orden aleatorio.
 * Se gana si se contesta a todos satisfactoriamente.
 */
 exports.playCmd = rl => {
   //log('Jugar.', 'red');
   let score = 0;
   let toBeResolved = [];
	 
   for(let i=0; i<model.count(); i++){
     toBeResolved[i] = model.getByIndex(i);
   };
   
   const playOne = () => {
    if(toBeResolved.length === 0) {
      log("No hay más preguntas.");
      log("Fin del juego. Aciertos: " + score);
      biglog(score, 'magenta');
      score = 0;
      rl.prompt();
    } else {
      let ir = Math.random() * (toBeResolved.length - 1);
      let id = Math.rounf(ir);
      rl.question(colorize(toBeResolved[id].question+"? ", 'red'), answer => {
        if(toBeResolved[id].answer.toLowerCase().trim() === answer.toLowerCase().trim()){
          score++;
          log('CORRECTO - Total '+ score + ' aciertos.', 'green');
          toBeResolved.splice(id, 1);
          playOne();
        } else {
          log('INCORRECTO.', 'red');
          log("Fin del juego. Aciertos: " + score);
          biglog(score, 'magenta');
          score = 0;
          rl.prompt();
        }
      });
    }
   } 
   playOne();
 };
 
 
 /**
  * Muestra los nombres de los autores de la práctica.
  */
exports.creditsCmd = rl => {
  log('Autores de la práctica:');
  log('Lucia Martin Perez', 'green');
  log('Olga Rico Diez', 'green');
  rl.prompt();
}


/**
 * Terminar el programa.
 */
exports.quitCmd = rl => {
  rl.close();
  rl.prompt();
}




