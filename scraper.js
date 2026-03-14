const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function scrapeMovies() {
    console.log('Starting to scrape watch-movies.com.pk...\n');
    
    const allMovies = [];
    const baseUrl = 'https://www.watch-movies.com.pk';
    
    for (let page = 1; page <= 10; page++) {
        console.log(`Scraping page ${page}/10...`);
        
        try {
            const url = page === 1 ? baseUrl : `${baseUrl}/page/${page}/`;
            
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                },
                timeout: 30000
            });
            
            const $ = cheerio.load(response.data);
            
            let pageCount = 0;
            
            $('#main-content .post, .post-archive, article.post').each((i, el) => {
                const title = $(el).find('h2 a, .entry-title a, h2').first().text().trim();
                const link = $(el).find('h2 a, .entry-title a').first().attr('href');
                const image = $(el).find('img').attr('src') || $(el).find('img').attr('data-lazy-src') || $(el).find('img').attr('data-src');
                const excerpt = $(el).find('.entry-content, .excerpt, .entry-summary').text().trim();
                
                if (title && title.length > 5) {
                    allMovies.push({
                        id: allMovies.length + 1,
                        title: title.replace(/Watch Online|HD Print|Free Download/gi, '').trim(),
                        link: link || '',
                        image: image || '',
                        excerpt: excerpt.substring(0, 200)
                    });
                    pageCount++;
                }
            });
            
            console.log(`  Found ${pageCount} movies on page ${page}`);
            
            if (pageCount === 0) {
                console.log('  No more movies found. Stopping.');
                break;
            }
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } catch (error) {
            console.error(`  Error on page ${page}:`, error.message);
            break;
        }
    }
    
    console.log(`\nTotal movies scraped: ${allMovies.length}`);
    
    const outputFile = 'movies-data.json';
    fs.writeFileSync(outputFile, JSON.stringify(allMovies, null, 2));
    console.log(`Data saved to ${outputFile}`);
    
    return allMovies;
}

scrapeMovies().catch(console.error);
