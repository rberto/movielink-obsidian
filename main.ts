import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting, SuggestModal} from 'obsidian';
import MovieDB = require('node-themoviedb');


interface MovieLinkSettings {
	tmdb_api_key: string;
}

const DEFAULT_SETTINGS: MovieLinkSettings = {
	tmdb_api_key: ''
}

class Media{
	title: string;
	id: number;
	genres: Array<string>;
	release: string;
	link: string;

	public static fromMovieDetail (details_data: MovieDB.Responses.Movie.GetDetails): Media {
		const cls = new Media();

		cls.title = details_data.title;
		cls.id = details_data.id;
		cls.genres = [];
		for (const genre of details_data.genres) {
			console.log(genre.name);
			cls.genres.push(genre.name);
		}
		cls.release = details_data.release_date;
		return cls;
	}

	public static fromTvShowDetail (details_data: MovieDB.Responses.TV.GetDetails) {
		const cls = new Media();
		cls.title = details_data.name;
		cls.id = details_data.id;
		cls.genres = [];
		for (const genre of details_data.genres) {
			console.log(genre.name);
			cls.genres.push(genre.name);
		}
		cls.release = details_data.first_air_date;
		return cls;
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

	async getTvShows(title: string) {
		const result = new Array<Media>();
		try {
			const args = {
				query: {query: title}
			};
			const tvshows = await this.mdb.search.TVShows(args);

			for (const tvshow of tvshows.data.results) {

				const detail = await this.mdb.tv.getDetails({
					pathParameters: {
						tv_id: tvshow.id
					}
				});
				result.push(Media.fromTvShowDetail(detail.data))
			}


			console.log(result);

			return result;
		} catch (error) {
			console.error(error);
		}
	}

	async getMovies(title: string) {
		const result = new Array<Media>();
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
				result.push(Media.fromMovieDetail(detail.data))
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

		this.addCommand({
			id: 'movielink-selecttvshow-command',
			name: 'insert tvshow link based on title',
			editorCallback: async (editor: Editor, view: MarkdownView) => { 
				const sel = editor.getSelection();
				const movies = await this.getTvShows(sel);

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

export class SuggestMovie extends SuggestModal<Media> {

	medias:Array<Media>
	editor: Editor
	mdb: MovieDB

	constructor(app: App, medias: Array<Media>, editor: Editor, mdb: MovieDB) {
		super(app);
		this.editor = editor;
		this.medias = medias;
		this.mdb = mdb;
	}

	// Returns all available suggestions.
	getSuggestions(query: string): Media[] {
		return this.medias.filter((media) =>
			media.title.toLowerCase().includes(query.toLowerCase())
		);
	}
  
	// Renders each suggestion item.
	renderSuggestion(media: Media, el: HTMLElement) {
		el.createEl("div", { text: media.title });
		let str_genres = media.get_year_of_release() + " - "
		for (const g of media.genres) {
			console.log(str_genres);
			str_genres += g;
			str_genres += " / "
		}
		el.createEl("small", { text: str_genres });
	}

	// Perform action on the selected suggestion.
	async onChooseSuggestion(media: Media, evt: MouseEvent | KeyboardEvent) {
		new Notice(`Selected ${media.title}`);
		const id = await media.getLink(this.mdb);
		console.info(id);
		this.editor.replaceSelection(
			"[" + media.title + "](https://www.imdb.com/title/" + String(id) + ")");
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
