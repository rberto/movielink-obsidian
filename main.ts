import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting, SuggestModal} from 'obsidian';
// import MovieDB from 'node-themoviedb';
import { GetMovies, GetTvShows, TVShow, Movie, MovieExternalIDs, TVShowExternalIDs} from 'description';


interface MovieLinkSettings {
	tmdb_api_key: string;
}

const DEFAULT_SETTINGS: MovieLinkSettings = {
	tmdb_api_key: ''
}

// class Media{
// 	title: string;
// 	id: number;
// 	genres: Array<string>;
// 	release: Date;
// 	link: string;
// 	isTvShow: boolean;

// 	public genresString() {
// 		let str_genres = ""
// 		for (const g of this.genres) {
// 			str_genres += g;
// 			str_genres += " / "
// 		}
// 		return str_genres.slice(0, -3);
// 	}

	// public static fromMovieDetail (details_data: MovieDB.Responses.Movie.GetDetails): Media {
	// 	const cls = new Media();

	// 	cls.title = details_data.title;
	// 	cls.id = details_data.id;
	// 	cls.genres = [];
	// 	for (const genre of details_data.genres) {
	// 		console.log(genre.name);
	// 		cls.genres.push(genre.name);
	// 	}
	// 	cls.release = new Date(details_data.release_date);
	// 	cls.isTvShow = false;
	// 	return cls;
	// }

	// public static fromTvShowDetail (details_data: MovieDB.Responses.TV.GetDetails) {
	// 	const cls = new Media();
	// 	cls.title = details_data.name;
	// 	cls.id = details_data.id;
	// 	cls.genres = [];
	// 	for (const genre of details_data.genres) {
	// 		console.log(genre.name);
	// 		cls.genres.push(genre.name);
	// 	}
	// 	cls.release = new Date(details_data.first_air_date);
	// 	cls.isTvShow = true;
	// 	return cls;
	// }

// 	get_year_of_release() {
// 		return this.release.getFullYear();
// 	}

// 	// async getImdbLink(mdb: MovieDB) {
// 	// 	if (this.isTvShow == false) {
// 	// 		const result = await mdb.movie.getExternalIDs({
// 	// 			pathParameters: {
// 	// 				movie_id: this.id
// 	// 			}
// 	// 		});
// 	// 		return "https://www.imdb.com/title/" + String(result.data.imdb_id);
// 	// 	} else {
// 	// 		const result = await mdb.tv.getExternalIDs({
// 	// 			pathParameters: {
// 	// 				tv_id: this.id
// 	// 			}
// 	// 		});
// 	// 		return "https://www.imdb.com/title/" + String(result.data.imdb_id);
// 	// 	}
// 	// }
// }


export default class MovieLink extends Plugin {
	settings: MovieLinkSettings;
	request_option: {
		method: string;
		headers: {
			accept: string;
			Authorization: string;
		};
	};

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

	// public static async getTvShows(title: string, mdb: MovieDB) {
	// 	const args = {
	// 		query: {query: title}
	// 	};
	// 	const tvshows = await mdb.search.TVShows(args);

	// 	const prom = Promise.all(tvshows.data.results.map(elt => MovieLink.getTvShowDetail(elt, mdb)));

	// 	return prom;
	// }

	// static async getTvShowDetail(tvshow: MovieDB.Objects.TVShow, mdb: MovieDB) {
	// 	const tvshow_details = mdb.tv.getDetails({
	// 		pathParameters: {
	// 			tv_id: tvshow.id
	// 		}
	// 	});

	// 	return Media.fromTvShowDetail((await tvshow_details).data)

	// }

	// static async getMovieDetail(movie: MovieDB.Objects.Movie, mdb: MovieDB) {
	// 	const movie_details =  mdb.movie.getDetails({
	// 		pathParameters: {
	// 			movie_id: movie.id
	// 		}
	// 	});

	// 	return Media.fromMovieDetail((await movie_details).data)
	// }

	// public check_credential() {
	// 	const options = {
	// 		method: 'GET',
	// 		headers: {
	// 		  accept: 'application/json',
	// 		  Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJkYzU4MjUyMWJlMGM1ODI4NjgwNmNhNmNkMDE2NTM4YiIsIm5iZiI6MTczMTU1MTA0NC43MDAyMDI1LCJzdWIiOiI2NzAzNTExMzc4MzBjMTMwMWU3ZDYyZDYiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.WOPKehi4_W6h_CPjLocjfqAPbeA3WNAGPTcieaZBt58'
	// 		}
	// 	  };

	// 	  fetch('https://api.themoviedb.org/3/search/movie?query=john%20wick&include_adult=false&language=en-US&page=1', options)
	// 		.then(res => res.json())
	// 		.then(res => console.log(res))
	// 		.catch(err => console.error(err));
	// }

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

	async onload() {

		await this.loadSettings();

		this.request_option = {
			method: 'GET',
			headers: {
			accept: 'application/json',
			Authorization: 'Bearer ' + this.settings.tmdb_api_key
			}
		};

		// this.mdb = new MovieDB(this.settings.tmdb_api_key, {});

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
			new Notice("Error trying to retreive media list" + error);
			console.error(error);
			prom = []
		}
		console.timeEnd("movie")
		return prom;
	}
  
	renderSuggestion(movie: Movie, el: HTMLElement) {
		el.createEl("div", { text: movie.title });
		const str_description = movie.release_date;
		el.createEl("small", { text: str_description });
	}

	async onChooseSuggestion(movie: Movie, evt: MouseEvent | KeyboardEvent) {
		new Notice(`Selected ${movie.title}`);
		try{
			const extids = await this.plugin.getMovieExternalId(movie.id);
			console.info(extids);
			this.editor.replaceSelection(
				"[" + movie.title + " (" + movie.release_date + ")](" + "https://www.imdb.com/title/" + String(extids.imdb_id) + ")");	
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
		const str_description = tvshow.first_air_date;
		el.createEl("small", { text: str_description });
	}

	async onChooseSuggestion(tvshow: TVShow, evt: MouseEvent | KeyboardEvent) {
		new Notice(`Selected ${tvshow.name}`);
		try{
			const extids = await this.plugin.getTVshowExternalId(tvshow.id);
			console.info(extids);
			this.editor.replaceSelection(
				"[" + tvshow.name + " (" + tvshow.first_air_date + ")](" + "https://www.imdb.com/title/" + String(extids.imdb_id) + ")");	
		} catch (error) {
			new Notice("Error trying to retreive media link" + error);
			console.error(error);
		}
	}
  }

// export class SuggestMedia extends SuggestModal<Media> {

// 	medias:Array<Media>
// 	sel: string
// 	mdb: MovieDB
// 	editor: Editor
// 	lastSearch: string
// 	lastSearchTime: number
// 	private delayInMs = 250
// 	suggestMovie = false

// 	constructor(app: App, editor: Editor, sel: string, mdb: MovieDB, suggestMovie: boolean) {
// 		super(app);
// 		this.sel = sel;
// 		this.editor = editor;
// 		this.mdb = mdb;
// 		this.suggestMovie = suggestMovie;
// 	}

// 	async getSuggestions(query: string): Promise <Media []> {
// 		if (this.sel != "") {
// 			query = this.sel;
// 		}
// 		if (query === this.lastSearch || query.length < 3) return [];
//         const timestamp = Date.now();
//         this.lastSearchTime = timestamp;
//         const Sleep = (ms: number) =>
//             new Promise((resolve) => setTimeout(resolve, ms));
//         await Sleep(this.delayInMs);
//         if (this.lastSearchTime != timestamp) {
//             // Search is canceled by a newer search
//             return [];
//         }
// 		this.lastSearch = query;

// 		console.time("movie");
		
		
// 		let prom = null;

// 		try {
// 			if (this.suggestMovie == true) {
// 				prom = MovieLink.getMovies(query, this.mdb);
// 			} else {
// 				prom = MovieLink.getTvShows(query, this.mdb);
// 			}
// 		} catch (error) {
// 			new Notice("Error trying to retreive media list" + error);
// 			console.error(error);
// 			prom = []
// 		}
// 		console.timeEnd("movie")
// 		return prom;
// 	}
  
// 	renderSuggestion(media: Media, el: HTMLElement) {
// 		el.createEl("div", { text: media.title });
// 		const str_genres = media.get_year_of_release() + " - " + media.genresString()
// 		el.createEl("small", { text: str_genres });
// 	}

// 	async onChooseSuggestion(media: Media, evt: MouseEvent | KeyboardEvent) {
// 		new Notice(`Selected ${media.title}`);
// 		try{
// 			const link = await media.getImdbLink(this.mdb);
// 			console.info(link);
// 			this.editor.replaceSelection(
// 				"[" + media.title + " (" + media.get_year_of_release() + ")" + " - " + media.genresString() + "](" + link + ")");	
// 		} catch (error) {
// 			new Notice("Error trying to retreive media link" + error);
// 			console.error(error);
// 		}
// 	}
//   }


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
