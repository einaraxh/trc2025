import express from 'express';
import http, { get } from 'http';
import { Server } from 'socket.io';
import jsonfile from 'jsonfile';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const randomRange = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);
const distance = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

//import config from './config.js'
//import { stats } from './stats.js';
//console.log(config)

app.set('view engine', 'ejs');

// Serve static files from 'public' folder
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'public')));

let dataBase = jsonfile.readFileSync('data.json')
let once = true
const getCost = (statType) => {
  function getUpgradeCost(_level, _min, _max, _levels) {

    // Derive the factor so that cost(n) = _max
    const factor = Math.pow(_max / _min, 1 / _levels);
    // Calculate the cost at the requested level
    return _min * Math.pow(factor, _level);
  }
  function getTotalUpgradeCost(_min, _max, _levels) {
    // Derive the same factor (ratio) as in getUpgradeCost
    const factor = Math.pow(_max / _min, 1 / _levels);
  
    let totalCost = 0;
    // Typically, you pay cost(level = 1) to go from lvl 0 to lvl 1,
    // cost(level = 2) to go 1 -> 2, etc. So we sum from 1 up to _levels.
    for (let level = 1; level <= _levels; level++) {
      totalCost += _min * Math.pow(factor, level);
    }
  
    return Math.round(totalCost)
  }
  

  let stat, cost
  let totalCost = {winCondition: 0, n: 0, radius: 0, decoyChance: 0, decoyAlpha: 0}
  switch (statType) {
    case 'winCondition':
      stat = dataBase.winCondition
      cost = getUpgradeCost(stat.level, stat.costSpan[0], stat.costSpan[1], stat.levels)
      break
    case 'n':
      stat = dataBase.n
      cost = getUpgradeCost(stat.level, stat.costSpan[0], stat.costSpan[1], stat.levels)
      break
    case 'radius':
      const area = (r) => r*r*Math.PI
      const map = (x) => (x - areaSpan[0]) / (areaSpan[1] - areaSpan[0])

      stat = dataBase.radius
      cost = getUpgradeCost(stat.level, stat.costSpan[0], stat.costSpan[1], stat.levels)
      break
    case 'decoyChance':
      stat = dataBase.decoyChance
      cost = getUpgradeCost(stat.level, stat.costSpan[0], stat.costSpan[1], stat.levels)
      break
    case 'decoyAlpha':
      stat = dataBase.decoyAlpha
      cost = getUpgradeCost(stat.level, stat.costSpan[0], stat.costSpan[1], stat.levels)
      break
  }
  stat = dataBase.winCondition
  totalCost.winCondition = getTotalUpgradeCost(stat.costSpan[0], stat.costSpan[1], stat.levels)
  stat = dataBase.n
  totalCost.n = getTotalUpgradeCost(stat.costSpan[0], stat.costSpan[1], stat.levels)
  stat = dataBase.radius
  totalCost.radius = getTotalUpgradeCost(stat.costSpan[0], stat.costSpan[1], stat.levels)
  stat = dataBase.decoyChance
  totalCost.decoyChance = getTotalUpgradeCost(stat.costSpan[0], stat.costSpan[1], stat.levels)
  stat = dataBase.decoyAlpha
  totalCost.decoyAlpha = getTotalUpgradeCost(stat.costSpan[0], stat.costSpan[1], stat.levels)
  console.log("totalCost", totalCost)

  return Math.round(cost)
}

const getValue = (statType) => {
  //console.log("getValue() case:", statType)
  let level, levels, start, end, retVal, stat
  switch (statType) {
    case 'winCondition':
      stat = dataBase.winCondition
      retVal = stat.span[0] + (stat.span[1] - stat.span[0]) * ((stat.level) / (stat.levels));
      return retVal
    case 'n':
      stat = dataBase.n
      retVal = stat.span[0] - (stat.span[0] - stat.span[1]) * ((stat.level) / (stat.levels))
      return retVal
      case 'radius':
      stat = dataBase.radius
      retVal = stat.span[0] + (stat.span[1] - stat.span[0]) * ((stat.level) / (stat.levels));
      //retVal = retVal*retVal*Math.PI
      return Math.round(retVal)
      case 'decoyChance':
      stat = dataBase.decoyChance
      retVal = stat.span[0] + (stat.span[1] - stat.span[0]) * ((stat.level) / (stat.levels));
      return retVal
      case 'decoyAlpha':
      stat = dataBase.decoyAlpha
      retVal = stat.span[0] + (stat.span[1] - stat.span[0]) * ((stat.level) / (stat.levels));
      return retVal
  }
}

async function saveDataBase() {
  dataBase.winCondition.value = getValue('winCondition')
  dataBase.winCondition.cost = getCost('winCondition')
  dataBase.n.value = getValue('n')
  dataBase.n.cost = getCost('n')
  dataBase.radius.value = getValue('radius')
  dataBase.radius.cost = getCost('radius')
  dataBase.decoyChance.value = getValue('decoyChance')
  dataBase.decoyChance.cost = getCost('decoyChance')
  dataBase.decoyAlpha.value = getValue('decoyAlpha')
  dataBase.decoyAlpha.cost = getCost('decoyAlpha')
  await jsonfile.writeFileSync('data.json', dataBase)
  io.emit("sync", dataBase); // Send updated stats to all clients
  console.log("Saved data, tokens:", dataBase.tokens)
}

saveDataBase()

// Serve index.html when accessing root
app.get('/', async (req, res) => {
  res.render('main')
});

app.get('/ballgame', (req, res) => {
  res.render('ballgame')
})

app.get('/blackjack', (req, res) => {
  res.render('blackjack')
})

app.get('/mirkwood', (req, res) => {
  res.render('mirkwood')
})

/* app.get('/mirkwood', (req, res) => {
  res.render('mirkwood')
}) */

/* let stats = {
  strength: { level: 1, cost: 10 },
  agility: { level: 1, cost: 15 },
  intelligence: { level: 1, cost: 20 }
}; */

app.get('/spend', (req, res) => {
  res.render('spend', { dataBase })
})


// WebSocket connection
io.on('connection', async (socket) => {
  socket.on('enter', (value) => {
    switch (value) {
      case 'councilawakens':
        console.log("enter game")
        socket.emit('enter', '/assets/uppgift2.png')
        break
      case 'intothefire':
        socket.emit('enter', '/assets/uppgift3.jpg')
        break
      case '246395520':
        socket.emit('enter', '/ballgame')
        break
      case 'letmein':
        socket.emit('enter', '/mirkwood')
        break
      case 'binary':
        socket.emit('enter', '/assets/binary.png')
        break
    }
  })
  //dataBase.tokens = 100

  /* dataBase.winCondition.level = 0
  dataBase.n.level = 15
  dataBase.radius.level = 25
  dataBase.decoyChance.level = 0
  dataBase.decoyAlpha.level = 0 */

  await saveDataBase()

  socket.emit("sync", dataBase);

  let gameMode
  let gameState = 'off'
  let keys
  let startTime
  let clicks = []

  console.log('A user connected:', socket.id);

  socket.on('init', async (data) => {
    console.log("init", data, " | current gameState:", gameState)
    gameMode = data
    await saveDataBase()
    if (gameState == 'on' && clicks.length > 0) {
      console.log('interrupted!')
      emitScore('interrupt')
    }
    gameState = 'off'
    keys = []
    clicks = []
  })

  async function emitScore(context) {
    gameState = 'score'
    console.log("counting score:", gameMode, context)


    console.log('emitScore()', clicks)
    let clickStats = [{ms: clicks[0].time-startTime}]
    clickStats[0].hit = distance(clicks[0], keys[0]) <= dataBase.radius.value ? "hit" : "miss"
    for (let i = 1; i < clicks.length; i++) {
      let temp = {ms: clicks[i].time-clicks[i-1].time}
      temp.hit = distance(clicks[i], keys[i]) <= dataBase.radius.value ? "hit" : "miss"
      clickStats.push(temp)
    }
    let averageMs = 0
    clickStats.forEach(element => {
      averageMs += element.ms
    })
    averageMs = Math.round(averageMs / clickStats.length)

    let allhits = true
    clickStats.forEach(element => {
      if (element.hit != "hit") allhits = false
    })
    if (context != 'complete') allhits = false

    let result = {
      mode: gameMode,
      context: context,
      clickStats: clickStats,
      averageMs: averageMs,
      allhits: allhits
    }
    
    if (context == 'complete') {
      if (gameMode == 'challenge') {
        //count and send score
        //check win condition, if lose increase difficulty
        if (dataBase.winCondition.value > averageMs && allhits) {
          result.msg = "mirkwood"
        } else {
          let statName = await punish()
          result.msg = "You failed the challenge! " + statName + " level has been reduced!"
        }
        
      } else if (gameMode == 'practice') {
        //count and send score
        //check token reward, if lose remove tokens
        if (allhits) {
          /* let reward = 1/(result.averageMs/winCondition)
          console.log("reward:", 20*reward)
          console.log("reward:", 20*reward ** 3) */
          //map reward between [10, 20] from [winCondition, winCondition*2]
          const baseReward = 10
          //const bonus = (baseReward*2-baseReward)/(dataBase.winCondition*2-dataBase.winCondition) * (result.averageMs-dataBase.winCondition)
          //const performance = (result.averageMs - dataBase.winCondition.value) > 0 ? (result.averageMs - dataBase.winCondition.value) : 0
          //const bonus = baseReward - baseReward*((performance) / dataBase.winCondition.value)
          const performance = 1-(result.averageMs-dataBase.winCondition.value)/dataBase.winCondition.value
          let bonus = Math.round(baseReward * performance)
          if (bonus < 0) bonus = 0
          
          console.log("reward:", bonus, performance)
          result.msg = "You completed the practice run! " + baseReward + " tokens have been rewarded, and " + bonus + " tokens as speed bonus!"
          await tokenReward(baseReward+bonus)
        } else {
          result.msg = "You failed the practice run. 10% tokens have been removed!"
          await tokenReward(0)
        }
        
      }
    } else if (context == 'interrupt') {
      if (gameMode == 'challenge') {
        //count and send score
        //lose condition, increase difficulty
        let statName = await punish()
        result.msg = "Challenge was interrupted. " + statName + " level has been reduced!"
        
      } else if (gameMode == 'practice') {
        //count and send score
        //lose condition, remove tokens
        result.msg = "Practice run was interrupted. 10% tokens have been removed!"
        await tokenReward(0)
      }
    }

    //socket.emit('sync', {n: n, radius: radius, winCondition: winCondition, tokens: tokens})
    await saveDataBase()
    socket.emit('endGame', result)
    socket.emit('message', result.msg)
    console.log("emitScore()")
  }

  socket.on('click', (data) => {
    //console.log(data)
    switch(gameState) {
      case 'off':
        startTime = data.time
        gameState = 'on'
        keys = []
        for (let i = 0; i < dataBase.n.value; i++) {
          keys.push({
            x : randomRange(dataBase.radius.value, 800-dataBase.radius.value),
            y : randomRange(dataBase.radius.value, 600-dataBase.radius.value)
          })
        }
        socket.emit('startGame', keys)
        break;
      case 'on':
        //data.time -= startTime
        clicks.push(data)
        //data.distance = distance(data, keys[0])
        if (clicks.length == keys.length) {
          
          emitScore('complete')

        }
        break;
        case 'score':
          //console.log('Scoreboard, click voided')
          break;
      }
  })

  socket.on('endGame', () => {
    endTime = Date.now()
    //socket.emit('score', endTime - startTime)
  })

  // Handle disconnect
  socket.on('disconnect', () => {
      if (gameState == 'on') {
        if (gameMode == 'challenge') {
          //count and send score
          //lose condition, increase difficulty
          let statName = punish()
          
        } else if (gameMode == 'practice') {
          //count and send score
          //lose condition, remove tokens
          tokenReward(0)
        }
      }
      console.log('User disconnected:', socket.id);
  })

  function tokenReward(reward) {
    console.log("tokenReward()", reward)
    if (reward) {
      dataBase.tokens += reward
      console.log("reward:", reward)
    } else {
      console.log("punish:", dataBase.tokens*0.1)
      dataBase.tokens = Math.round(dataBase.tokens*0.9)
      console.log("after:", dataBase.tokens*0.1)
    }
  }

  async function spendTokens(amount) {
    console.log("spendTokens()", amount, dataBase.tokens)
    if (dataBase.tokens >= amount) {
      console.log("spending", amount)
      dataBase.tokens -= amount
      return true
    } else {
      console.log("not enough tokens")
      return false
    }
  }

  async function punish() {
    console.log("punish()")
    let statNames = ["winCondition", "n", "radius", "decoyChance", "decoyAlpha"]
    //prune stats with level 0
    statNames = statNames.filter(statName => dataBase[statName].level > 0)
    console.log("pruned list", statNames)
    if (statNames.length == 0) return "No"
    //sort statNames based on upgrade cost
    statNames.sort((a, b) => {
      return dataBase[a].cost - dataBase[b].cost
    })
    console.log("sorted list", statNames)
    let maxCostStat = statNames[statNames.length-1]
    console.log("maxCostStat", maxCostStat, dataBase[maxCostStat])
    dataBase[maxCostStat].level -= 1
    console.log("after", dataBase[maxCostStat])
    return dataBase[maxCostStat].name
  }

  //stats
  socket.on("upgradeStat", async(statName) => {
    console.log("upgradeStat", statName)
    let canAfford = await spendTokens(dataBase[statName].cost)
    console.log("debug", canAfford)
    if (canAfford) {
      //dataBase.tokens -= dataBase[statName].cost
      switch (statName) {
        case "winCondition":
          if (dataBase.winCondition.level < dataBase.winCondition.levels) {
            dataBase.winCondition.level += 1;
          }
          break;
        case "n":
          if (dataBase.n.level < dataBase.n.levels) {
            dataBase.n.level += 1;
          }
          break;
        case "radius":
          if (dataBase.radius.level < dataBase.radius.levels) {
            dataBase.radius.level += 1;
          }
          break;
        case "decoyChance":
          if (dataBase.decoyChance.level < dataBase.decoyChance.levels) {
            dataBase.decoyChance.level += 1;
          }
          break;
        case "decoyAlpha":
          if (dataBase.decoyAlpha.level < dataBase.decoyAlpha.levels) {
            dataBase.decoyAlpha.level += 1;
          }
          break;
      }
    }
    await saveDataBase()
  })

  socket.on("ghk5w", (bet) => {
    console.log("bj_bet", bet)
    if (bet > dataBase.tokens) {
      socket.emit("startBlackjack", 'poor')
    } else {
      dataBase.tokens -= bet
      socket.emit("startBlackjack", 'ok')
    }
    saveDataBase()
  })
  socket.on("b3dl3", (bet) => {
    console.log("bj_double", bet)
    if (bet > dataBase.tokens) {
      socket.emit("b3dl3", 'poor')
    } else {
      dataBase.tokens -= bet
      socket.emit("b3dl3", 'ok')
    }
    saveDataBase()
  })
  socket.on("6m67k", (hand) => {
    console.log("nj_push", hand)
    dataBase.tokens += hand
    saveDataBase()
  })
  socket.on("0x56j", (hand) => {
    console.log("bj_win", hand)
    dataBase.tokens += 2*hand
    saveDataBase()
  })


});

// Start the server
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
