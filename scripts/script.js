"strict";

class Move {
	constructor (pos, fX, fY) {
		this.from = pos;
		this.to = Object.freeze({
			x: fX(pos.x),
			y: fY(pos.y)
		});
	}
}

class Robot {
	constructor (x, y) {
		this.initialPos = Object.freeze({ x: x, y: y });
		this.pos = Object.freeze({ x: x, y: y});
		this.moveAcceptors = [];
		this.moveObservers = [];
		this.spriteUrl = 'img/Robot_37500.png';
	}

	goLeft() {
		const move = this._makeMove(
			(x) => x - 1,
			(y) => y);
		this._doMove(move);
	}

	goRight() {
		const move = this._makeMove(
			(x) => x + 1,
			(y) => y);
		this._doMove(move);
	}

	goUp() {
		const move = this._makeMove(
			(x) => x,
			(y) => y - 1);
		this._doMove(move);
	}

	goDown() {
		const move = this._makeMove(
			(x) => x,
			(y) => y + 1);
		this._doMove(move);
	}
	
	_makeMove(fX, fY) {
		return Object.freeze(new Move(
			this.pos,
			fX,
			fY));
	}

	_doMove(move) {
		if (_.every(this.moveAcceptors, (x) => x(move, this))) {
			this.pos = move.to;
			_.each(this.moveObservers, (x) => x(move, this));
		}
	}
};

class GridBoundary {
	constructor(minX, minY, maxX, maxY) {
		this.x = Object.freeze({min: minX, max: maxX});
		this.y = Object.freeze({min: minY, max: maxY});
	}

	subscribe(robot) {
		robot.moveAcceptors.push(_.bind(this.acceptWithinBounds, this));
	}

	acceptWithinBounds(move) {
		return move.to.x >= this.x.min
			&& move.to.x <= this.x.max
			&& move.to.y >= this.y.min
			&& move.to.y <= this.y.max;
	}
};

class Finish {
	constructor(x, y) {
		this.pos = Object.freeze({ x: x, y: y});
		this.spriteUrl = 'img/Sports-Finish-Flag-icon.png';
	}

	subscribe(robot, scene) {
		this.scene = scene;
		robot.moveObservers.push(_.bind(this.finishWhenReached, this));
	}

	finishWhenReached(move) {
		if (move.to.x == this.pos.x
				&& move.to.y == this.pos.y) {
			this.scene.program.stop();
			window.alert("Gelukt!\nJe hebt de robot bij de finish gebracht!");
			levels.nextLevel();
		}
	}
}

class Wall {
	constructor(x, y) {
		this.pos = Object.freeze({ x: x, y: y});
		this.spriteUrl = 'img/bricksx64.png';
	}

	subscribe(robot) {
		robot.moveAcceptors.push(_.bind(this.block, this));
	}

	block(move) {
		var isBlocked = move.to.x == this.pos.x
			&& move.to.y == this.pos.y;
		if (isBlocked) {
			window.alert("Au!\nEen muur");
		}
		return !isBlocked;
	}
}

const syntaxCommandAndCount = /(left|right|up|down)\((\d+)\)\w*/g;

class Compiler {
	constructor(robot) {
		this.robot = robot;
	}

	compile(programText) {
		const commandAndCountPairs = this._textToCommandAndCountPairs(programText);
		const commands = _.flatMap(
			commandAndCountPairs,
			this._repeatCommand);
		const functions = _.map(
			commands,
			_.bind(this._commandToFunction, this));
		return functions;
		
	}

	_textToCommandAndCountPairs(text) {
		const matches = text.matchAll(syntaxCommandAndCount);
		return _.map(
			Array.from(matches),
			this._makeCommandAndCountPair);
	}

	_makeCommandAndCountPair(x) {
		return Object.freeze({
			command: x[1],
			count: x[2]});
	}

	_repeatCommand(commandAndCountPair) {
		return _.times(commandAndCountPair.count, _.constant(commandAndCountPair.command));
	}

	_commandToFunction(command) {
		const mapping = {
			left: this.robot.goLeft,
			right: this.robot.goRight,
			up: this.robot.goUp,
			down: this.robot.goDown,
		}
		return _.bind(mapping[command], this.robot);
	}
};

class Program {
	constructor(source, actionList, stepDelay, observers) {
		this.status = 'stopped';
		this.source = source;
		this.actionList = actionList;
		this.stepDelay = stepDelay;
		this.observers = observers || [];
	}

	run() {
		if (!this.isRunning()) {
			const steps = _.map(this.actionList, this._step.bind(this));
			if (steps && steps.length >= 1) {
				this._setStatus('running');
				var promise = steps[0]();
				const tail = steps.slice(1);
				for (const x of tail) {
					promise = promise.then(x);
				}
				promise.then(() => this._setStatus('finished'));
			}
		}
	}

	stop() {
		this._setStatus('abort');
	}

	isRunning() {
		return this.status == 'running';
	}

	_step(action) {
		const me = this;
		return function() {
			const ret = $.Deferred();
			function whenRunning(f) {
				return me.isRunning()
					? f()
					: ret.reject();
			}

			whenRunning(action);
			whenRunning(() => setTimeout(
				() => whenRunning(ret.resolve),
				me.stepDelay));

			return ret;
		}
	}

	_setStatus(newStatus) {
		const oldStatus = this.status;
		this.status = newStatus;
		this._notifyObservers(oldStatus, this.status);
	}

	_notifyObservers(oldStatus, status) {
		_.each(this.observers, (f) => f(this, status, oldStatus));
	}
}

class Scene {
	constructor(robot, bounds, otherEntities, programObservers) {
		this.$element = $('#scene');
		this.$programText = $('#sourceCode');
		this.programObservers = programObservers || [];
		this.entities = _.concat(robot, bounds, otherEntities);
		this.robot = robot;
		this.bounds = bounds;
		this.stepDelay = 500;

		this._subscribeEvents();
	}

	reset() {
		this._resetAllEntitiesToInitialPosition();
		this.render();
	}

	render() {
		this._renderGrid();
		this._showAllEntities();
	}

	runProgram() {
		if (!this.hasRunningProgram()) {
			this.program = this._makeProgram();
			this.reset();
			this.program.run();
		}
		else {
			alert('Even wachten, het programma loopt nog.');
		}
	}

	hasRunningProgram() {
		return this.program
			&& this.program.isRunning();
	}

	_subscribeEvents() {
		this._subscribeMoveAnimation(this.robot);
		this._subscribeAllEnities();
	}

	_subscribeAllEnities() {
		this._forEntities(
			(x) => x.subscribe,
			(x) => x.subscribe(this.robot, this));
	}

	_subscribeMoveAnimation(robot) {
		robot.moveObservers.push(_.bind(this._moveSprite, this));
	}

	_renderGrid() {
		var tableHtml = [];
		for (let y = this.bounds.y.min; y <= this.bounds.y.max; ++y) {
			tableHtml.push('<tr>');
			for (let x = this.bounds.x.min; x <= this.bounds.x.max; ++x) {
				tableHtml.push('<td></td>');
			}
			tableHtml.push('</tr>');
		}
		return this.$element.html(tableHtml.join(''));
	}

	_makeProgram() {
		const compiler = new Compiler(this.robot);
		const source = this.$programText.val();
		const interpretedProgram = compiler.compile(source);
		return new Program(source, interpretedProgram, this.stepDelay, this.programObservers);
	}

	_forEntities(predicate, action) {
		_.each(
			_.filter(
				this.entities,
				predicate),
			action);
	}

	_moveSprite(move, entity) {
		this._clear(move.from);
		this._showSprite(move.to, entity);
	}

	_showSprite(pos, entity) {
		this._findCell(pos)
			.html('<img src="' + entity.spriteUrl + '"/>');
	}

	_showAllEntities() {
		const me = this;
		this._forEntities(
			(x) => x.spriteUrl && x.pos,
			(x) => me._showSprite(x.pos, x));
	}

	_clear(pos) {
		this._findCell(pos)
			.html('');
	}

	_findCell(pos) {
		return this.$element
			.find("tr").eq(pos.y - this.bounds.y.min)
			.find("td").eq(pos.x - this.bounds.x.min);
	}

	_resetToInitialPosition(entity) {
		entity.pos = entity.initialPos;
	}

	_resetAllEntitiesToInitialPosition() {
		const me = this;
		this._forEntities(
			(x) => x.initialPos && x.pos,
			(x) => me._resetToInitialPosition(x));
	}
}

class Levels {
	constructor() {
		this.levelFactories = [
			() => new Scene(
				new Robot(4, 4),
				new GridBoundary(0, 0, 4, 4),
				[ new Finish(2, 2) ]),
			() => new Scene(
				new Robot(4, 4),
				new GridBoundary(0, 0, 4, 4),
				[	new Finish(2, 2),
					new Wall(2, 3), new Wall(3, 3), new Wall(4, 3) ]),
			() => new Scene(
				new Robot(4, 5),
				new GridBoundary(0, 0, 4, 6),
				[	new Finish(0, 0),
					new Wall(0, 2), new Wall(1, 2), new Wall(2, 2), new Wall(2, 0),
					new Wall(2, 5), new Wall(2, 4), new Wall(3, 4), new Wall(4, 4) ]),
		];
		this.level = 1;
	}

	setLevel(level) {
		this.level=level;
		scene = this.levelFactories[level-1]();
		scene.programObservers.push(disableButtonsWhenProgramIsRunning);
		scene.render();
	}

	hasNextLevel() {
		return this.level < this.levelFactories.length;
	}

	nextLevel() {
		if (this.hasNextLevel()) {
			this.setLevel(this.level + 1);
		}
	}
}

var levels;
var scene = null;

$(document).ready(function() {
	"strict";
	levels = new Levels();
	levels.setLevel(
		new URLSearchParams(window.location.search)
			.get('level')
		?? 1);
});

function disableButtonsWhenProgramIsRunning() {
	$('button').attr('disabled', scene.hasRunningProgram());
}

