import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting, SuggestModal} from 'obsidian';
import { GetMovies, GetTvShows, TVShow, Movie, MovieExternalIDs, TVShowExternalIDs, Common} from 'description';


interface MovieLinkSettings {
	tmdb_api_key: string;
}

const DEFAULT_SETTINGS: MovieLinkSettings = {
	tmdb_api_key: ''
}


export default class MovieLink extends Plugin {
	settings: MovieLinkSettings;
	request_option: {
		method: string;
		headers: {
			accept: string;
			Authorization: string;
		};
	};
	movie_genres: Common;
	tvshow_genres: Common;

	async getMovieExternalId(id: number): Promise<MovieExternalIDs> {

		const external_ids = fetch('https://api.themoviedb.org/3/movie/' + encodeURI(String(id)) + '/external_ids', this.request_option)
			.then(res => res.json())
			.then((res: MovieExternalIDs) => { return res })
		return external_ids;
	}

	async getTVshowExternalId(id: number): Promise<TVShowExternalIDs> {

		const external_ids = fetch('https://api.themoviedb.org/3/tv/' + encodeURI(String(id)) + '/external_ids', this.request_option)
			.then(res => res.json())
			.then((res: TVShowExternalIDs) => { return res })
		return external_ids;
	}

	public async getTvshows(title: string) {
		const movies = fetch('https://api.themoviedb.org/3/search/tv?query=' + encodeURI(title) + '&include_adult=false&language=en-US&page=1', this.request_option)
			.then(res => res.json())
			.then((res: GetTvShows) => {
				return res.results
				// const prom = Promise.all(res.results.map(elt => MovieLink.getMovieDetail(elt, mdb)));
				// return prom;
			})
		return movies
	}

	public async getMovies(title: string) {
		const movies = fetch('https://api.themoviedb.org/3/search/movie?query=' + encodeURI(title) + '&include_adult=false&language=en-US&page=1', this.request_option)
			.then(res => res.json())
			.then((res: GetMovies) => {
				return res.results
				// const prom = Promise.all(res.results.map(elt => MovieLink.getMovieDetail(elt, mdb)));
				// return prom;
			})
		return movies
	}

	public async getMovieGenres() {
		const genres = fetch('https://api.themoviedb.org/3/genre/movie/list?language=en', this.request_option)
			.then(res => res.json())
			.then((res: Common) => {return res})
			// .catch(err => console.error(err));
		return genres;
	}

	public async getTvShowGenres() {
		const genres = fetch('https://api.themoviedb.org/3/genre/tv/list?language=en', this.request_option)
			.then(res => res.json())
			.then((res: Common) => {return res})
			// .catch(err => console.error(err));
		return genres;
	}

	public genreid2str(list: Common, id: number) {
		for (const elt of list.genres) {
			if (elt.id === id) return elt.name;
		}
	}

	async onload() {

		await this.loadSettings();

		this.request_option = {
			method: 'GET',
			headers: {
			accept: 'application/json',
			Authorization: 'Bearer ' + this.settings.tmdb_api_key
			}
		};

		console.info("load genres")
		this.movie_genres = await this.getMovieGenres()
		this.tvshow_genres = await this.getTvShowGenres()
		console.info(this.movie_genres)

		this.addCommand({
			id: 'movielink-selectreplacemovie-command',
			name: 'Replace selection with movie link',
			editorCallback: async (editor: Editor, view: MarkdownView) => { 
				const sel = editor.getSelection();

				new SuggestMovie(this.app, this, editor, sel).open();

				console.log(`You have selected: ${sel}`);
			}
		});

		this.addCommand({
			id: 'movielink-selecttvshow-command',
			name: 'Replace selection with tvshow link',
			editorCallback: async (editor: Editor, view: MarkdownView) => { 
				const sel = editor.getSelection();

				new SuggestTVShow(this.app, this, editor, sel).open();

				console.log(`You have selected: ${sel}`);
			}
		});

		this.addCommand({
			id: 'movielink-insertmovie-command',
			name: 'Insert movie link',
			editorCallback: async (editor: Editor, view: MarkdownView) => { 
				new SuggestMovie(this.app, this, editor, "").open();
			}
		});

		this.addCommand({
			id: 'movielink-inserttvshow-command',
			name: 'Insert TV-show link',
			editorCallback: async (editor: Editor, view: MarkdownView) => { 
				new SuggestTVShow(this.app, this, editor, "").open();
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

	plugin: MovieLink
	sel: string
	editor: Editor
	lastSearch: string
	lastSearchTime: number
	private delayInMs = 250

	constructor(app: App, plugin: MovieLink, editor: Editor, sel: string) {
		super(app);
		this.plugin = plugin
		this.sel = sel;
		this.editor = editor;
	}

	async getSuggestions(query: string): Promise <Movie []> {
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
			prom = this.plugin.getMovies(query);
		} catch (error) {
			new Notice("Error trying to retreive movies list" + error);
			console.error(error);
			prom = []
		}
		console.timeEnd("movie")
		return prom;
	}
  
	renderSuggestion(movie: Movie, el: HTMLElement) {
		el.createEl("div", { text: movie.title });
		let str_description = String(new Date(movie.release_date).getFullYear());
		movie.genre_ids.forEach(elt => { str_description += " - " + this.plugin.genreid2str(this.plugin.movie_genres, elt)})
		el.createEl("small", { text: str_description });
	}

	async onChooseSuggestion(movie: Movie, evt: MouseEvent | KeyboardEvent) {
		new Notice(`Selected ${movie.title}`);
		try{
			const extids = await this.plugin.getMovieExternalId(movie.id);
			console.info(extids);
			this.editor.replaceSelection(
				`[${movie.title} (${new Date(movie.release_date).getFullYear()})](https://www.imdb.com/title/${String(extids.imdb_id)})`);	
		} catch (error) {
			new Notice("Error trying to retreive media link" + error);
			console.error(error);
		}
	}
  }

  export class SuggestTVShow extends SuggestModal<TVShow> {

	plugin: MovieLink
	sel: string
	editor: Editor
	lastSearch: string
	lastSearchTime: number
	private delayInMs = 250

	constructor(app: App, plugin: MovieLink, editor: Editor, sel: string) {
		super(app);
		this.plugin = plugin
		this.sel = sel;
		this.editor = editor;
	}

	async getSuggestions(query: string): Promise <TVShow []> {
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
			prom = this.plugin.getTvshows(query);
		} catch (error) {
			new Notice("Error trying to retreive media list" + error);
			console.error(error);
			prom = []
		}
		console.timeEnd("movie")
		return prom;
	}
  
	renderSuggestion(tvshow: TVShow, el: HTMLElement) {
		el.createEl("div", { text: tvshow.name });
		let str_description = String(new Date(tvshow.first_air_date).getFullYear())
		tvshow.genre_ids.forEach(elt => { str_description += " - " + this.plugin.genreid2str(this.plugin.tvshow_genres, elt)})
		el.createEl("small", { text: str_description });
	}

	async onChooseSuggestion(tvshow: TVShow, evt: MouseEvent | KeyboardEvent) {
		new Notice(`Selected ${tvshow.name}`);
		try{
			const extids = await this.plugin.getTVshowExternalId(tvshow.id);
			console.info(extids);
			this.editor.replaceSelection(
				"[" + tvshow.name + " (" + new Date(tvshow.first_air_date).getFullYear() + ")](" + "https://www.imdb.com/title/" + String(extids.imdb_id) + ")");	
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
