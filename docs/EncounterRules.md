# Encounter Rules

The backend plays the encounter alone and decides win or lose (US-19). The player cannot send a result.

## 1. Encounter information

Each encounter stores:

- The encounter name.
- The wild monster.
- The difficulty (`enemy_scale`).
- The reward is the wild monster from the encounter.
- A copy of the player's team when the encounter starts.
- The random seed (saved when the encounter is resolved).

Difficulty values:

| Difficulty | `enemy_scale` |
|---|---:|
| Easy | 0.8 |
| Medium | 1.2 |
| Hard | 1.5 |
| Boss | 1.8 |

The wild monster must be in the monster list.

## 2. Monster stats

The battle uses these monster stats:

- HP 
- Attack
- Defence
- Elements
Gender does not affect the battle.

- Final stat = species stat + the monster's IV. 
Example: base HP 60 + HP IV 4 = 64.
- The wild monster's HP, attack and defence are multiplied by the difficulty and rounded to the nearest whole number (0.5 goes up). Example: 65 x 1.5 = 97.5, so 98 HP.

## 3. Element bonuses

- Water beats Fire.
- Fire beats Earth.
- Earth beats Water.
- Dark is neutral.

| Match-up | Bonus |
|---|---:|
| Attacker's element beats the defender's element | x1.25 |
| Defender's element beats the attacker's element | x0.80 |
| Neither beats the other | x1.00 |

If a monster has two elements, calculate the bonus for each one and use the average. 
Example: bonuses(1.25 + 0.80) / 2 = 1.025.

Dark always gives a neutral bonus of ×1.00.

## 4. How the battle works

1. The first monster of the saved team starts.
2. Battle HP of a monster = final HP x 3.
3. Each round the team monster attacks first. The wild monster attacks second if it is still alive.
4. If the wild monster's HP is 0 or less, the player wins.
5. If the team monster's HP is 0 or less, the next team monster takes its place.
6. If all team monsters are defeated, the player loses.
7. If there is no winner after 50 rounds, the player loses.
8. After the encounter all team monsters go back to full HP.
Damage from the encounter is not kept.

## 5. Damage formula

`Damage = Attack x Element Bonus x Luck x 100 / (100 + Defender's Defence)`

- Round to the nearest whole number (0.5 goes up).
- Damage is never lower than 1.
- Luck is between 0.85 and 1.15 and is different for every attack.

Example: attack 72, bonus 1.00, luck 1.05, defender's defence 75:
`72 x 1.00 x 1.05 x 100 / 175 = 43.2`, so the damage is 43.

## 6. Random numbers and the seed (TBD)

1. When the backend resolves an encounter, it makes a seed of 16 random letters and numbers and saves it.
2. All random values come from the seed.
3. To get a random value `U`:
   - Join seed with label for example `a1b2c3d4e5f60718:1:team`.
   - Calculate the SHA256 hash of this text.
   - Take the first 8 characters of the hash and read them as a hexadecimal number.
   - Divide it by `0xFFFFFFFF`.
4. Luck = 0.85 + (0.30 x U).
5. Labels for the attacks:
 `1:team` for the team's first attack in round 1.
- `1:enemy` for the wild monster's attack in round 1.
- `2:team` for the team's attack in round 2.
- `2:enemy` for the wild monster's attack in round 2.

Continue the same pattern for later rounds. If the wild monster is defeated before its attack, no enemy attack is made for that round.
6. The same seed and the same saved data always give the same result.

## 7. Rewards

1. If the player loses, there is no reward (US-12).
2. If the player wins, the player receives the wild monster.
3. If the player loses, the player receives nothing (US-12).Otherwise there is no reward.
4. If the collection is full, there is no reward.
5. A reward can only be given once for an encounter.

The new monster gets its IVs and gender from the seed. Each IV is from 0 to 10:

`IV = floor(U x 11)`

The labels: `reward:hp`, `reward:attack`, `reward:defence` and `reward:gender`.

For gender, if `U` of `reward:gender` is below 0.5 the monster is male, otherwise female.

## 8. Time and team rules

1. The encounter has to be resolved within 10 minutes.
2. If not, it fails and the wild monster disappears. The player loses nothing.
3. A resolved encounter cannot be resolved again.
4. The team is copied when the encounter starts.Changing the team later does not change the encounter.

## 9. Example

### Wild monster

The wild monster is Duskfang:

| Stat | Base value |
|---|---:|
| Element | Dark |
| HP | 65 |
| Attack | 90 |
| Defence | 50 |
| Difficulty | 1.5 |
| Reward chance | 0.5 (50%) |

After applying the difficulty:

- HP: 65 x 1.5 = 97.5, so 98.
- Attack: 90 x 1.5 = 135.
- Defence: 50 x 1.5 = 75.
- Battle HP: 98 x 3 = 294.

### Player's team

| Team monster | Element | Base stats + IV | Final stats | Battle HP |
|---|---|---|---|---:|
| Flameling | Fire | 60/70/40 + 4/2/1 | 64/72/41 | 192 |
| Aquaris | Water | 70/55/60 + 1/6/3 | 71/61/63 | 213 |
| Stonehorn | Earth | 80/45/80 + 7/0/5 | 87/45/85 | 261 |

Duskfang is Dark, so the element bonus is x1.00 for all of them.

### Seed `a1b2c3d4e5f60718`

- Flameling attacks first. After 3 rounds Duskfang has 163 HP left and Flameling is defeated.
- Aquaris takes over. After 3 more rounds Duskfang has 63 HP left and Aquaris is defeated.
- Stonehorn takes over and defeats Duskfang in round 9.
- The player wins.

Reward: `U = 0.2031` is below 0.5, so the player gets Duskfang. Its IVs are 0/10/1 and it is female.

### Seed `0123456789abcdef`

Same team, same Duskfang, different seed, so the luck values are different.

- Flameling is defeated in round 2.
- Aquaris is defeated in round 5.
- Stonehorn is defeated in round 9.
- Duskfang still has 17 HP.

The player loses and gets no reward.
