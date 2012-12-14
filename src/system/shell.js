/**
 * Terminus.js
 * Copyright © 2012 Ramón Lamana
 */
 define(function(require) {
	
	'use strict';

	var Util = require('core/util');
	var Promise = require('core/promise');

	var Process = require('system/process');
	var InputStream = require('io/inputstream');
	var OutputStream = require('io/outputstream');

	/**
	 * @class
	 */
	var Shell = function(commands) {
		this._environment = {};

		if(commands)
			this.include(commands);

		// Create Standard Streams
		this.streams = {
			stdin: new InputStream(),
			stdout: new OutputStream(),
			stderr: new OutputStream(),
			web: new OutputStream()
		};

		this.commands = [];
		this.history = [];
	};

	Shell.prototype = {
		commands: null,
		streams: null,
		history: null,

		_environment: null,
		
		getEnv: function(key) {
			return this._environment[key] ? this._environment[key] : null;
		},

		exec: function(input) {
			var group, commands, proc;

			this.history.push(input);

			commands = this._parse(input);
			console.log(commands);
			commands.forEach(function(command, index) {
				// Execute first shell native commands
				if (this.native[command.name]) {
					this.native[command.name].apply(this, command.args);
					return Promise.done();
				} else {
					// Search command in commander stack
					for(var i = this.commands.length; i--;) {
						group = this.commands[i];
						if (group[command.name]) {
							var proc = new Process(this.streams);
							return proc.exec(group[command.name], command.args); // Return promise
						} 
					}
				}

				this.streams.stderr.write("Command '"+command.name+"' not found.");
			}, 
			this);

			return Promise.done();
		},

		search: function(key) {
			var found = [], commands = [];

			for(var i = this.commands.length; i--;) 
				commands = Util.Array.merge(commands, Object.keys(this.commands[i]));
			
			var regexp = new RegExp('^'+key, "i");

			// Proposal only for commands not for arguments
			//if(arguments.length <= 1) {
				for (var i = commands.length; i--;) {
					if (regexp.test(commands[i])) {
						found.push(commands[i]);
					}
				}
			//}
			// @todo proposal for arguments asking the commander. Adding else here.

			return found;
		},

		/**
		 * Attaches a group of commands
		 * @param {Array} List of commands
		 */
		include: function(commands) {
			this.commands = this.commands.concat(commands); 
		},

		/**
		 * Parse input string to get commands and args
		 * @return An array of {command, args} objects
		 */
		_parse: function(input) {
			var commands = input.split('|');

			return commands.map(function(command) {
				var args = command.trim().split(' ');
				command = args[0];
				args.shift();
				return {
					name: command,
					args: args
				}
			});
		},

		/**
		 * Shell native commands
		 */
		native: {
			history: function() {
				var output = ''
				for(var i=0, l=this.history.length; i<l; i++)
					output += ' ' + i + ': ' + this.history[i] + '\n';

				this.streams.stdout.write(output);
			},

			clear: function() {
				this.streams.stdin.events.emit('clear');
			}
		}
	};

	return Shell;
});




