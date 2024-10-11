import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, SuggestModal} from 'obsidian';
import MovieDB = require('node-themoviedb');

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

class Movie{
	title: string;
	id: number;
	genres: Array<string>;
	release: string;
	link: string;

	constructor(details_data: MovieDB.Responses.Movie.GetDetails) {
		this.title = details_data.title;
		this.id = details_data.id;
		this.genres = [];
		for (const genre of details_data.genres) {
			console.log(genre.name);
			this.genres.push(genre.name);
		}
		this.release = details_data.release_date;
	}

	get_year_of_release() {
		const index = this.release.indexOf("-");
		return this.release.substring(0, index);
	}

	async getLink(mdb: MovieDB) {
		try{
			const result = await mdb.movie.getExternalIDs({
				pathParameters: {
					movie_id: this.id
				}
			});
			return result.data.imdb_id;
		} catch (error) {
			console.error(error);
			console.error("Could not get external id for id" + String(this.id))
		}
		return ""
	}

}


export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	mdb: MovieDB;



	async getMovies(title: string) {
		const result = new Array<Movie>();
		try {
			const args = {
				query: {query: title}
			};
			const movies = await this.mdb.search.movies(args);

			for (const movie of movies.data.results) {

				const detail = await this.mdb.movie.getDetails({
					pathParameters: {
						movie_id: movie.id
					}
				});
				result.push(new Movie(detail.data))
			}


			console.log(result);
			/*
			  {
				data: Object. Parsed json data of response
				headers: Object. Headers of response
			  }
			*/
			return result;
		} catch (error) {
			console.error(error);
		}
	}


	async onload() {

		await this.loadSettings();

		// ES6 Style
		// import MovieDB from 'node-themoviedb';
		this.mdb = new MovieDB("", {});

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'insert movie based on title',
			editorCallback: async (editor: Editor, view: MarkdownView) => { 
				const sel = editor.getSelection();
				const movies = await this.getMovies(sel);

				new ExampleModal(this.app, movies, editor, this.mdb).open();


				console.log(`You have selected: ${sel}`);
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

export class ExampleModal extends SuggestModal<Movie> {

	movies:Array<Movie>
	editor: Editor
	mdb: MovieDB

	constructor(app: App, movies: Array<Movie>, editor: Editor, mdb: MovieDB) {
		super(app);
		this.editor = editor;
		this.movies = movies;
		this.mdb = mdb;
		// for (const m of data.results) {
		// 	this.movies.push({title: m.title, year: m.release_date, genre: String(m.genre_ids[0])})
		// }
	}
	// Returns all available suggestions.
	getSuggestions(query: string): Movie[] {
		return this.movies.filter((movie) =>
			movie.title.toLowerCase().includes(query.toLowerCase())
		);
	}
  
	// Renders each suggestion item.
	renderSuggestion(movie: Movie, el: HTMLElement) {
		el.createEl("div", { text: movie.title });
		let str_genres = movie.get_year_of_release() + " - "
		for (const g of movie.genres) {
			console.log(str_genres);
			str_genres += g;
			str_genres += " / "
		}
		el.createEl("small", { text: str_genres });
	}

	// Perform action on the selected suggestion.
	async onChooseSuggestion(movie: Movie, evt: MouseEvent | KeyboardEvent) {
		new Notice(`Selected ${movie.title}`);
		const id = await movie.getLink(this.mdb);
		console.info(id);
		this.editor.replaceSelection(
			"[" + movie.title + "](https://www.imdb.com/title/" + String(id) + ")");
	}
  }

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
