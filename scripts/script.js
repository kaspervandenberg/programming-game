"strict";
var scene = {
	robot: {
		x: 4,
		y: 4
	},
	grid: {
		minX: 0,
		maxX: 4,
		minY: 0,
		maxY: 4,
	},
	initial: {
		x: 4,
		y: 4
	},
	timing: {
		stepDelay: 1000,
	},
};


$(document).ready(function() {
    "strict";
    showRobot();
});

function showRobot()
{
    $("#scene tr").eq(scene.robot.y)
	.find("td").eq(scene.robot.x)
	.html("<img src='img/Robot_37500.png'>");
}

function clearRobot()
{
    $("#scene tr").eq(scene.robot.y)
	.find("td").eq(scene.robot.x)
	.html("");
}

function goLeft()
{
    if (scene.robot.x > scene.grid.minX) {
		--scene.robot.x;
    }
}

function goRight()
{
    if (scene.robot.x < scene.grid.maxX) {
		++scene.robot.x;
    }
}

function goUp()
{
    if (scene.robot.y > scene.grid.minY) {
		--scene.robot.y;
    }
}

function goDown()
{
    if (scene.robot.y < scene.grid.maxY) {
		++scene.robot.y;
    }
}

function goStart()
{
	scene.robot.x = scene.initial.x;
	scene.robot.y = scene.initial.y;
}

function step(f)
{
    return function ()
    {
		clearRobot();
		f();
        showRobot();
        var ret = new $.Deferred();
        setTimeout(function () {
            ret.resolve();
        }, scene.timing.stepDelay);
		return ret;
    }
}

function interpret()
{
	const sourceCommandAndCounts = splitToCommandAndCounts(
		$("#sourceCode").val());
	const commands = repeatCommands(sourceCommandAndCounts);
	const steps = [ step(goStart) ]
		  .concat(Array.from(
			map(
				map(commands,
					commandToFunction),
				step)));
	const sequence = sequenceOfSteps(steps);
	return sequence;
}

function splitToCommandAndCounts(text)
{
	const commandAndCount = /(left|right|up|down)\((\d+)\)\w*/g;
	return text.matchAll(commandAndCount);
}

function* repeatCommands(commandAndCounts)
{
	for (const x of commandAndCounts)
    {
		for (let i = 0; i < x[2]; ++i)
		{
			yield x[1];
		}
	}
}
    
function* map(items, f)
{
	for (const x of items)
	{
		yield f(x);
	}
}

function commandToFunction(command)
{
	const mapping = {
		"left": goLeft,
		"right": goRight,
		"up": goUp,
		"down": goDown,
    };

    return mapping[command];
}

function sequenceOfSteps(steps)
{
	if (steps && steps.length >= 2)
	{
		const first = steps[0];
		const tail = steps.slice(1);
		return function stepSequence()
		{
			var futureResult = first();
			for (x of tail) {
				futureResult = futureResult.then(x);
			}
		};
	}
	else if (steps && steps.length == 1)
	{
		return steps[0];
	}
	else
	{
		return function nop() {};
	}
}
