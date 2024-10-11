import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting, SuggestModal} from 'obsidian';
import MovieDB = require('node-themoviedb');


interface MovieLinkSettings {
	tmdb_api_key: string;
}

const DEFAULT_SETTINGS: MovieLinkSettings = {
	tmdb_api_key: ''
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


export default class MovieLink extends Plugin {
	settings: MovieLinkSettings;
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

			return result;
		} catch (error) {
			console.error(error);
		}
	}


	async onload() {

		await this.loadSettings();

		this.mdb = new MovieDB(this.settings.tmdb_api_key, {});

		this.addCommand({
			id: 'movielink-selectmovie-command',
			name: 'insert movie link based on title',
			editorCallback: async (editor: Editor, view: MarkdownView) => { 
				const sel = editor.getSelection();
				const movies = await this.getMovies(sel);

				if (movies == undefined) {
					return;
				}

				new SuggestMovie(this.app, movies, editor, this.mdb).open();

				console.log(`You have selected: ${sel}`);
			}
		});

		this.addSettingTab(new MovieLinkSettingTab(this.app, this));

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

export class SuggestMovie extends SuggestModal<Movie> {

	movies:Array<Movie>
	editor: Editor
	mdb: MovieDB

	constructor(app: App, movies: Array<Movie>, editor: Editor, mdb: MovieDB) {
		super(app);
		this.editor = editor;
		this.movies = movies;
		this.mdb = mdb;
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


class MovieLinkSettingTab extends PluginSettingTab {
	plugin: MovieLink;

	constructor(app: App, plugin: MovieLink) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('The Movie Database API key')
			.setDesc('Your API key')
			.addText(text => text
				.setPlaceholder('Enter your TMDB API key')
				.setValue(this.plugin.settings.tmdb_api_key)
				.onChange(async (value) => {
					this.plugin.settings.tmdb_api_key = value;
					await this.plugin.saveSettings();
				}));
	}
}
