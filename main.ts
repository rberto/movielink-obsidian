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
	release: Date;
	link: string;
	isTvShow: boolean;

	public genresString() {
		let str_genres = ""
		for (const g of this.genres) {
			str_genres += g;
			str_genres += " / "
		}
		return str_genres.slice(0, -3);
	}

	public static fromMovieDetail (details_data: MovieDB.Responses.Movie.GetDetails): Media {
		const cls = new Media();

		cls.title = details_data.title;
		cls.id = details_data.id;
		cls.genres = [];
		for (const genre of details_data.genres) {
			console.log(genre.name);
			cls.genres.push(genre.name);
		}
		cls.release = new Date(details_data.release_date);
		cls.isTvShow = false;
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
		cls.release = new Date(details_data.first_air_date);
		cls.isTvShow = true;
		return cls;
	}

	get_year_of_release() {
		return this.release.getFullYear();
	}

	async getImdbLink(mdb: MovieDB) {
		if (this.isTvShow == false) {
			const result = await mdb.movie.getExternalIDs({
				pathParameters: {
					movie_id: this.id
				}
			});
			return "https://www.imdb.com/title/" + String(result.data.imdb_id);
		} else {
			const result = await mdb.tv.getExternalIDs({
				pathParameters: {
					tv_id: this.id
				}
			});
			return "https://www.imdb.com/title/" + String(result.data.imdb_id);
		}
	}
}


export default class MovieLink extends Plugin {
	settings: MovieLinkSettings;
	mdb: MovieDB;

	public static async getTvShows(title: string, mdb: MovieDB) {
		const args = {
			query: {query: title}
		};
		const tvshows = await mdb.search.TVShows(args);

		const prom = Promise.all(tvshows.data.results.map(elt => MovieLink.getTvShowDetail(elt, mdb)));

		return prom;
	}

	static async getTvShowDetail(tvshow: MovieDB.Objects.TVShow, mdb: MovieDB) {
		const tvshow_details = mdb.tv.getDetails({
			pathParameters: {
				tv_id: tvshow.id
			}
		});

		return Media.fromTvShowDetail((await tvshow_details).data)

	}

	static async getMovieDetail(movie: MovieDB.Objects.Movie, mdb: MovieDB) {
		const movie_details =  mdb.movie.getDetails({
			pathParameters: {
				movie_id: movie.id
			}
		});

		return Media.fromMovieDetail((await movie_details).data)
	}

	public static async getMovies(title: string, mdb: MovieDB) {
		const args = {
			query: {query: title}
		};

		const movies = await mdb.search.movies(args);

		const prom = Promise.all(movies.data.results.map(elt => MovieLink.getMovieDetail(elt, mdb)));

		return prom;

	}


	async onload() {

		await this.loadSettings();

		this.mdb = new MovieDB(this.settings.tmdb_api_key, {});

		this.addCommand({
			id: 'movielink-selectreplacemovie-command',
			name: 'Replace selection with movie link',
			editorCallback: async (editor: Editor, view: MarkdownView) => { 
				const sel = editor.getSelection();

				new SuggestMedia(this.app, editor, sel, this.mdb, true).open();

				console.log(`You have selected: ${sel}`);
			}
		});

		this.addCommand({
			id: 'movielink-selecttvshow-command',
			name: 'Replace selection with tvshow link',
			editorCallback: async (editor: Editor, view: MarkdownView) => { 
				const sel = editor.getSelection();

				new SuggestMedia(this.app, editor, sel, this.mdb, false).open();

				console.log(`You have selected: ${sel}`);
			}
		});

		this.addCommand({
			id: 'movielink-insertmovie-command',
			name: 'Insert movie link',
			editorCallback: async (editor: Editor, view: MarkdownView) => { 
				new SuggestMedia(this.app, editor, "", this.mdb, true).open();
			}
		});

		this.addCommand({
			id: 'movielink-inserttvshow-command',
			name: 'Insert TV-show link',
			editorCallback: async (editor: Editor, view: MarkdownView) => { 
				new SuggestMedia(this.app, editor, "", this.mdb, false).open();
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

export class SuggestMedia extends SuggestModal<Media> {

	medias:Array<Media>
	sel: string
	mdb: MovieDB
	editor: Editor
	lastSearch: string
	lastSearchTime: number
	private delayInMs = 250
	suggestMovie = false

	constructor(app: App, editor: Editor, sel: string, mdb: MovieDB, suggestMovie: boolean) {
		super(app);
		this.sel = sel;
		this.editor = editor;
		this.mdb = mdb;
		this.suggestMovie = suggestMovie;
	}

	async getSuggestions(query: string): Promise <Media []> {
		if (this.sel != "") {
			query = this.sel;
		}
		if (query === this.lastSearch || query.length < 3) return [];
        const timestamp = Date.now();
        this.lastSearchTime = timestamp;
        const Sleep = (ms: number) =>
            new Promise((resolve) => setTimeout(resolve, ms));
        await Sleep(this.delayInMs);
        if (this.lastSearchTime != timestamp) {
            // Search is canceled by a newer search
            return [];
        }
		this.lastSearch = query;

		console.time("movie");
		
		
		let prom = null;

		try {
			if (this.suggestMovie == true) {
				prom = MovieLink.getMovies(query, this.mdb);
			} else {
				prom = MovieLink.getTvShows(query, this.mdb);
			}
		} catch (error) {
			new Notice("Error trying to retreive media list" + error);
			console.error(error);
			prom = []
		}
		console.timeEnd("movie")
		return prom;
	}
  
	renderSuggestion(media: Media, el: HTMLElement) {
		el.createEl("div", { text: media.title });
		const str_genres = media.get_year_of_release() + " - " + media.genresString()
		el.createEl("small", { text: str_genres });
	}

	async onChooseSuggestion(media: Media, evt: MouseEvent | KeyboardEvent) {
		new Notice(`Selected ${media.title}`);
		try{
			const link = await media.getImdbLink(this.mdb);
			console.info(link);
			this.editor.replaceSelection(
				"[" + media.title + " (" + media.get_year_of_release() + ")" + " - " + media.genresString() + "](" + link + ")");	
		} catch (error) {
			new Notice("Error trying to retreive media link" + error);
			console.error(error);
		}
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
