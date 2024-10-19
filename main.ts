import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting, SuggestModal} from 'obsidian';
import MovieDB = require('node-themoviedb');
import { time, timeEnd } from 'console';


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

		try {
			const args = {
				query: {query: title}
			};
			const tvshows = await this.mdb.search.TVShows(args);

			const prom = Promise.all(tvshows.data.results.map(elt => MovieLink.getTvShowDetail(elt, this.mdb)));

			return prom;
		} catch (error) {
			console.error(error);
		}
	}

	public static async getTvShowDetail(tvshow: MovieDB.Objects.TVShow, mdb: MovieDB) {
		const tvshow_details = mdb.tv.getDetails({
			pathParameters: {
				tv_id: tvshow.id
			}
		});

		return Media.fromTvShowDetail((await tvshow_details).data)

	}

	public static async getMovieDetail(movie: MovieDB.Objects.Movie, mdb: MovieDB) {
		const movie_details =  mdb.movie.getDetails({
			pathParameters: {
				movie_id: movie.id
			}
		});

		return Media.fromMovieDetail((await movie_details).data)
	}

	public static async getMovies(title: string, mdb: MovieDB) {
		try {
			const args = {
				query: {query: title}
			};

			console.time("movie");

			const movies = await mdb.search.movies(args);

			const prom = Promise.all(movies.data.results.map(elt => MovieLink.getMovieDetail(elt, mdb)));

			console.timeEnd("movie");

			return prom;
		} catch (error) {
			console.error(error);
		}
	}


	async onload() {

		await this.loadSettings();

		this.mdb = new MovieDB(this.settings.tmdb_api_key, {});

		this.addCommand({
			id: 'movielink-selectreplacemovie-command',
			name: 'Replace selection with movie link',
			editorCallback: async (editor: Editor, view: MarkdownView) => { 
				const sel = editor.getSelection();

				new SuggestMovie(this.app, editor, sel, this.mdb).open();

				console.log(`You have selected: ${sel}`);
			}
		});

		this.addCommand({
			id: 'movielink-selecttvshow-command',
			name: 'Replace selection with tvshow link',
			editorCallback: async (editor: Editor, view: MarkdownView) => { 
				const sel = editor.getSelection();

				new SuggestMovie(this.app, editor, sel, this.mdb).open();

				console.log(`You have selected: ${sel}`);
			}
		});

		this.addCommand({
			id: 'movielink-insertmovie-command',
			name: 'Insert movie link',
			editorCallback: async (editor: Editor, view: MarkdownView) => { 
				new SuggestMovie(this.app, editor, "", this.mdb).open();
			}
		});

		this.addCommand({
			id: 'movielink-inserttvshow-command',
			name: 'Insert TV-show link',
			editorCallback: async (editor: Editor, view: MarkdownView) => { 
				new SuggestMovie(this.app, editor, "", this.mdb).open();
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
	sel: string
	mdb: MovieDB
	editor: Editor
	lastSearch: string
	lastSearchTime: number
	private delayInMs = 250

	constructor(app: App, editor: Editor, sel: string, mdb: MovieDB) {
		super(app);
		this.sel = sel;
		this.editor = editor;
		this.mdb = mdb;
	}

	async getSuggestions(query: string): Promise <Media []> {

		if (query === this.lastSearch || query.length < 3) return;
        const timestamp = Date.now();
        this.lastSearchTime = timestamp;
        const Sleep = (ms: number) =>
            new Promise((resolve) => setTimeout(resolve, ms));
        await Sleep(this.delayInMs);
        if (this.lastSearchTime != timestamp) {
            // Search is canceled by a newer search
            return;
        }
		this.lastSearch = query;

		console.time("movie");
		if (this.sel != "") {
			query = this.sel;
		}

		const prom = MovieLink.getMovies(query, this.mdb);

		return prom;
	}
  
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
