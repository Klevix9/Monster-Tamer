## Basic rules

### Player rules:

1. A player must have a minimum of 1 monster tamed at a time.  
2. A player can have a maximum of ...(tbd) monsters tamed at the same time.  
3. A player must choose one from a predetermined roster of 3(tbd) monsters when first starting the game.  
4. 

### Team rules:

1. Minimum of 1 monster active in the roster, with a maximum of 4(tbd).  
2. The same particular monster cannot be added more than once to an active roster. However the same type of monster, same species, same level etc, as long as there is no clash of ID's can be added as many times as the player wants to the maximum allowed.  
3. Up to 2 non-active teams can be created at a time and up to 1 active team.  
4. 

###   Monster rules:

1. When the hp hits 0, be that due to fighting, effects or whatever the case, the monster is replaced by the next one as the starting monster in the roster.  
2. Unless revived or through some other effect, dead monsters can not be used in battle or any other activity.  
3. Each monster will have the following characteristics: HP, attack, defence, element(s), gender, IV(individual values)

### Gameplay Rules:

1. An encounter cannot last longer than 10 minutes, or the player will be kicked from the encounter and the monster disappear.  
2. The player can only participate at 1 encounter at a time.  
3. 

### Account rules:

1. The account’s password must be comprised of at least 8 chars, 1 special char, and 1 digit.  
2. If more than 5 attempts have been made to login into a particular account, the login will be locked for the next 15 minutes.  
3. If the player has not been active for 60 consecutive minutes, the game will be automatically saved, the account automatically locked and sent back to the login screen.  
4. 

## Constants

| Constant | Value | Stories | Note |
| ----- | ----- | ----- | ----- |
| `TEAM_MIN_SIZE` | 1 monster | US-14, 15, 16 |  |
| `TEAM_MAX_SIZE` | 4 monsters | US-14, 15, 16 |  |
| `TEAM_ALLOW_DUPLICATE_MONSTER` | no | US-14, 16 | The same particular monster can’t appear twice in one team |
| `MAX_SAVED_TEAMS` | 3 per player | US-14 | 1 active, 2 non-active |
| `STARTER_MONSTER_COUNT` | 1, fixed set | US-03/starter story | List which 3 |
| `COLLECTION_ALLOW_DUPLICATES` | yes, shown as separate entries | US-09 | Can multiple instances of the same “species” be caught |
| `PASSWORD_MIN_LENGTH` | 8 chars, at least 1 special char \+ 1 digit | US-01 |  |
| `LOGIN_MAX_FAILED_ATTEMPTS` | 5 | US-02 |  |
| `LOGIN_LOCKOUT_DURATION` | 15 min | US-02 |  |
| `JWT_LIFETIME` | 60 min | US-05 | Expired login |
| `ENCOUNTER_TIMEOUT` | 10 min/or unlimited | US-18, 19 | An unresolved encounter expires after this |
| `MAX_ACTIVE_ENCOUNTERS` | 1 per player | US-18 |  |
| `MONSTER_STATS` | HP, attack, defence, element(s), gender, IV(individual values) | US-11, 13 | Plus which stats US-13 lets players edit |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |

