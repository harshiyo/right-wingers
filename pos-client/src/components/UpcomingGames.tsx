import { useState, useEffect } from 'react';
import { Calendar, Clock, Trophy } from 'lucide-react';

interface Game {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  date: string;
  time: string;
  league: 'NFL' | 'NHL' | 'NBA' | 'MLB';
  venue?: string;
  status: string;
}

const UpcomingGames = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUpcomingGames();
  }, []);

  const fetchUpcomingGames = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const allGames: Game[] = [];
      
      // Try multiple API sources
      try {
        // Try ESPN API first
        await fetchESPNGames(allGames);
      } catch (err) {
        console.error('ESPN API failed:', err);
      }

      // Try TheSportsDB API as backup
      if (allGames.length === 0) {
        try {
          await fetchSportsDBGames(allGames);
        } catch (err) {
          console.error('SportsDB API failed:', err);
        }
      }

      // If all APIs fail, use fallback sample data
      if (allGames.length === 0) {
        allGames.push(...getFallbackGames());
      }

      // Sort games by date and limit to next 4 games
      const sortedGames = allGames
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 4);

      setGames(sortedGames);
    } catch (err) {
      console.error('Error fetching games:', err);
      setError('Unable to load games');
      // Use fallback data on error
      setGames(getFallbackGames());
    } finally {
      setLoading(false);
    }
  };

  const fetchESPNGames = async (allGames: Game[]) => {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    
    const todayStr = today.toISOString().split('T')[0];
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    const leagues = [
      { endpoint: 'football/nfl', league: 'NFL' as const },
      { endpoint: 'hockey/nhl', league: 'NHL' as const },
      { endpoint: 'basketball/nba', league: 'NBA' as const }
    ];

    for (const { endpoint, league } of leagues) {
      try {
        const response = await fetch(
          `https://site.api.espn.com/apis/site/v2/sports/${endpoint}/scoreboard?dates=${todayStr.replace(/-/g, '')}-${nextWeekStr.replace(/-/g, '')}`
        );
        if (response.ok) {
          const data = await response.json();
          const games = parseESPNGames(data, league);
          allGames.push(...games);
        }
      } catch (err) {
        console.error(`Error fetching ${league} games:`, err);
      }
    }
  };

  const fetchSportsDBGames = async (allGames: Game[]) => {
    // TheSportsDB API for backup
    const leagues = [
      { id: '4391', name: 'NFL' as const },
      { id: '4380', name: 'NHL' as const },
      { id: '4387', name: 'NBA' as const }
    ];

    for (const { id, name } of leagues) {
      try {
        const response = await fetch(
          `https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=${id}`
        );
        if (response.ok) {
          const data = await response.json();
          const games = parseSportsDBGames(data, name);
          allGames.push(...games);
        }
      } catch (err) {
        console.error(`Error fetching ${name} games from SportsDB:`, err);
      }
    }
  };

  const parseESPNGames = (data: any, league: Game['league']): Game[] => {
    if (!data.events) return [];
    
    return data.events
      .filter((event: any) => {
        const gameDate = new Date(event.date);
        const now = new Date();
        const oneWeekFromNow = new Date();
        oneWeekFromNow.setDate(now.getDate() + 7);
        
        return gameDate >= now && gameDate <= oneWeekFromNow;
      })
      .map((event: any) => {
        const competition = event.competitions[0];
        const homeTeam = competition.competitors.find((c: any) => c.homeAway === 'home');
        const awayTeam = competition.competitors.find((c: any) => c.homeAway === 'away');
        
        return {
          id: event.id,
          homeTeam: homeTeam?.team?.displayName || 'TBD',
          awayTeam: awayTeam?.team?.displayName || 'TBD',
          homeTeamLogo: homeTeam?.team?.logo,
          awayTeamLogo: awayTeam?.team?.logo,
          date: event.date,
          time: new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          league,
          venue: competition.venue?.fullName,
          status: event.status?.type?.description || 'Scheduled'
        };
      });
  };

  const parseSportsDBGames = (data: any, league: Game['league']): Game[] => {
    if (!data.events) return [];
    
    return data.events
      .filter((event: any) => {
        const gameDate = new Date(event.dateEvent + ' ' + event.strTime);
        const now = new Date();
        const oneWeekFromNow = new Date();
        oneWeekFromNow.setDate(now.getDate() + 7);
        
        return gameDate >= now && gameDate <= oneWeekFromNow;
      })
      .map((event: any) => {
        const gameDate = new Date(event.dateEvent + ' ' + event.strTime);
        
        return {
          id: event.idEvent,
          homeTeam: event.strHomeTeam || 'TBD',
          awayTeam: event.strAwayTeam || 'TBD',
          date: gameDate.toISOString(),
          time: gameDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          league,
          venue: event.strVenue,
          status: 'Scheduled'
        };
      });
  };

  const getFallbackGames = (): Game[] => {
    const today = new Date();
    const games: Game[] = [];
    
    // Sample upcoming games for demonstration
    const sampleGames = [
      { home: 'Toronto Maple Leafs', away: 'Montreal Canadiens', league: 'NHL' as const, days: 1 },
      { home: 'Los Angeles Lakers', away: 'Boston Celtics', league: 'NBA' as const, days: 2 },
      { home: 'Green Bay Packers', away: 'Chicago Bears', league: 'NFL' as const, days: 3 },
      { home: 'Toronto Raptors', away: 'Miami Heat', league: 'NBA' as const, days: 4 },
      { home: 'Calgary Flames', away: 'Edmonton Oilers', league: 'NHL' as const, days: 5 },
      { home: 'New York Yankees', away: 'Toronto Blue Jays', league: 'MLB' as const, days: 6 }
    ];

    sampleGames.forEach((game, index) => {
      const gameDate = new Date(today);
      gameDate.setDate(today.getDate() + game.days);
      gameDate.setHours(19 + (index % 3), 0, 0, 0); // Vary game times
      
      games.push({
        id: `sample-${index}`,
        homeTeam: game.home,
        awayTeam: game.away,
        date: gameDate.toISOString(),
        time: gameDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        league: game.league,
        status: 'Scheduled'
      });
    });

    return games;
  };

  const getLeagueColor = (league: string) => {
    switch (league) {
      case 'NFL':
        return 'bg-green-600';
      case 'NHL':
        return 'bg-blue-600';
      case 'NBA':
        return 'bg-orange-600';
      case 'MLB':
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
    }
  };

  const getLeagueIcon = (league: string) => {
    switch (league) {
      case 'NFL':
        return '🏈';
      case 'NHL':
        return '🏒';
      case 'NBA':
        return '🏀';
      case 'MLB':
        return '⚾';
      default:
        return '🏆';
    }
  };

  if (loading) {
    return (
      <div className="mt-6 p-3 bg-white/10 rounded-lg w-full">
        <h3 className="text-sm font-semibold mb-3 flex items-center justify-center">
          <Trophy className="h-4 w-4 mr-2" />
          Upcoming Games
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse bg-white/20 rounded-lg p-3 h-20"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error && games.length === 0) {
    return (
      <div className="mt-6 p-3 bg-white/10 rounded-lg w-full">
        <h3 className="text-sm font-semibold mb-3 flex items-center justify-center">
          <Trophy className="h-4 w-4 mr-2" />
          Upcoming Games
        </h3>
        <p className="text-white/70 text-xs text-center">Unable to load games at this time</p>
      </div>
    );
  }

  return (
    <div className="mt-6 p-3 bg-white/10 rounded-lg w-full">
      <h3 className="text-sm font-semibold mb-3 flex items-center justify-center">
        <Trophy className="h-4 w-4 mr-2" />
        Upcoming Games
      </h3>
      
      {games.length === 0 ? (
        <p className="text-white/70 text-xs text-center py-4">
          No games scheduled for the next week
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {games.map((game) => (
            <div key={game.id} className="bg-white/20 rounded-lg p-3 min-w-0">
              {/* League badge and date */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <span className="text-base mr-2">{getLeagueIcon(game.league)}</span>
                  <span className={`px-2 py-1 rounded text-xs font-bold text-white ${getLeagueColor(game.league)}`}>
                    {game.league}
                  </span>
                </div>
                <div className="flex items-center text-white/70">
                  <Calendar className="h-3 w-3 mr-1" />
                  <span className="text-xs whitespace-nowrap">
                    {new Date(game.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
              </div>
              
              {/* Teams */}
              <div className="mb-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-white truncate pr-2" title={game.awayTeam}>
                    {game.awayTeam}
                  </span>
                  <span className="text-white/60 text-xs flex-shrink-0">AWAY</span>
                </div>
                <div className="text-center text-white/60 text-xs">vs</div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-white truncate pr-2" title={game.homeTeam}>
                    {game.homeTeam}
                  </span>
                  <span className="text-white/60 text-xs flex-shrink-0">HOME</span>
                </div>
              </div>
              
              {/* Time */}
              <div className="flex items-center justify-center text-white/80 bg-white/10 rounded py-1">
                <Clock className="h-3 w-3 mr-1" />
                <span className="text-xs font-medium">{game.time}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UpcomingGames; 