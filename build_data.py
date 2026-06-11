#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build data.js for the Hippo Mock Exam app.
 - Generates 10 interlocking crosswords (one per theme).
 - Loads the 10 cleaned Use-of-English tests (30 open-ended Qs each).
 - Pairs them into 10 exams and writes window.EXAM_DATA to data.js.

Run:  python3 build_data.py
"""
import json, random, os

random.seed(42)
HERE = os.path.dirname(os.path.abspath(__file__))

# ----- exam config -----
CONFIG = {
    "timeLimitSec": 40 * 60,     # 40 minutes (Little Hippo sitting: 20 reading + 20 UoE)
    "passPct": 75,               # average of crossword% and UoE%
    "examLabel": "My Little Test · A1",
}

# ====================================================================
# CROSSWORD BUILDER  (greedy interlock, validated placement)
# ====================================================================
def try_layout(words):
    grid, placements = {}, {}

    def can_place(word, r, c, d):
        dr, dc = (0, 1) if d == 'A' else (1, 0)
        if (r - dr, c - dc) in grid: return False, 0
        if (r + dr * len(word), c + dc * len(word)) in grid: return False, 0
        crosses = 0
        for i, ch in enumerate(word):
            rr, cc = r + dr * i, c + dc * i
            if (rr, cc) in grid:
                if grid[(rr, cc)] != ch: return False, 0
                crosses += 1
            else:
                if d == 'A':
                    if (rr - 1, cc) in grid or (rr + 1, cc) in grid: return False, 0
                else:
                    if (rr, cc - 1) in grid or (rr, cc + 1) in grid: return False, 0
        return True, crosses

    def place(word, r, c, d):
        dr, dc = (0, 1) if d == 'A' else (1, 0)
        for i, ch in enumerate(word):
            grid[(r + dr * i, c + dc * i)] = ch
        placements[word] = (r, c, d)

    order = words[:]
    random.shuffle(order)
    place(order[0][0], 0, 0, 'A')
    for word, _clue in order[1:]:
        best = None
        for (gr, gc), gch in list(grid.items()):
            for i, ch in enumerate(word):
                if ch != gch: continue
                for d, (ra, ca) in (('A', (gr, gc - i)), ('D', (gr - i, gc))):
                    ok, cr = can_place(word, ra, ca, d)
                    if ok and cr > 0 and (best is None or cr > best[0]):
                        best = (cr, ra, ca, d)
        if best:
            place(word, best[1], best[2], best[3])
    return placements, grid


def build_crossword(theme, words):
    best = None
    for _ in range(500):
        placements, grid = try_layout(words)
        rs = [r for r, c in grid]; cs = [c for r, c in grid]
        span = (max(rs) - min(rs)) + (max(cs) - min(cs))
        key = (len(placements), -span)
        if best is None or key > best[0]:
            best = (key, placements, grid)
    _, placements, grid = best

    minr = min(r for r, c in grid); minc = min(c for r, c in grid)
    g = {(r - minr, c - minc): ch for (r, c), ch in grid.items()}
    pl = {w: (r - minr, c - minc, d) for w, (r, c, d) in placements.items()}
    nrows = max(r for r, c in g) + 1
    ncols = max(c for r, c in g) + 1
    clue_map = dict(words)

    starts = {}
    for w, (r, c, d) in pl.items():
        starts.setdefault((r, c), []).append((d, w))
    numbers = {}
    across, down = [], []
    num = 1
    for r in range(nrows):
        for c in range(ncols):
            if (r, c) in starts:
                numbers[(r, c)] = num
                for d, w in sorted(starts[(r, c)]):
                    entry = {"num": num, "clue": clue_map[w], "answer": w,
                             "row": r, "col": c, "len": len(w)}
                    (across if d == 'A' else down).append(entry)
                num += 1

    cells = []
    for r in range(nrows):
        row = []
        for c in range(ncols):
            if (r, c) in g:
                row.append({"l": g[(r, c)], "num": numbers.get((r, c))})
            else:
                row.append(None)
        cells.append(row)

    across.sort(key=lambda e: e["num"]); down.sort(key=lambda e: e["num"])
    return {"theme": theme, "rows": nrows, "cols": ncols,
            "cells": cells, "across": across, "down": down}


# ====================================================================
# CROSSWORD WORD LISTS  (A1 young-learner vocabulary)
# ====================================================================
THEMES = [
    ("Animals", [("CAT","A small pet that says “meow”."),("DOG","A pet that barks."),("FISH","It lives in water and swims."),("LION","The big cat called the king of animals."),("BIRD","An animal with wings that can fly."),("HORSE","A big animal you can ride."),("MONKEY","It loves bananas and climbs trees."),("RABBIT","A small animal with long ears that hops."),("TIGER","A big orange cat with black stripes."),("SHEEP","A farm animal that gives us wool."),("COW","A farm animal that gives us milk."),("DUCK","A bird that swims and says “quack”.")]),
    ("Food and drink", [("APPLE","A round red or green fruit."),("BREAD","We make sandwiches with it."),("MILK","A white drink that comes from a cow."),("RICE","Small white grains we cook and eat."),("EGG","A hen lays this; we can fry it."),("BANANA","A long yellow fruit."),("WATER","We drink it every day; it has no colour."),("CHEESE","A yellow food made from milk."),("ORANGE","A round fruit; also a colour."),("SOUP","A hot food we eat with a spoon."),("CAKE","A sweet food for a birthday."),("MEAT","Food that comes from animals.")]),
    ("At school", [("BOOK","You read it."),("PEN","You write with it; it has ink."),("PENCIL","You write with it and can rub it out."),("DESK","A table you sit at to work."),("BAG","You carry your books in it."),("RULER","You use it to draw a straight line."),("TEACHER","This person helps you learn."),("CHAIR","You sit on it."),("PAPER","You write on this white sheet."),("BOARD","The teacher writes on it at the front."),("ERASER","You use it to rub out a mistake."),("CLASS","A group of pupils who learn together.")]),
    ("Family and people", [("MOTHER","Your female parent; your mum."),("FATHER","Your male parent; your dad."),("SISTER","A girl with the same parents as you."),("BROTHER","A boy with the same parents as you."),("BABY","A very young child."),("FAMILY","Mum, dad and children together."),("FRIEND","A person you like and play with."),("AUNT","Your mother's or father's sister."),("UNCLE","Your mother's or father's brother."),("COUSIN","Your aunt's or uncle's child."),("SON","A boy child of his parents."),("GRANDMA","Your mother's or father's mother.")]),
    ("Colours and shapes", [("RED","The colour of a tomato."),("BLUE","The colour of the sky."),("GREEN","The colour of grass."),("YELLOW","The colour of the sun and bananas."),("BLACK","The colour of night."),("WHITE","The colour of snow."),("CIRCLE","A round shape like the letter O."),("SQUARE","A shape with four equal sides."),("PINK","A light red colour."),("BROWN","The colour of chocolate and wood."),("PURPLE","The colour you make from red and blue."),("STAR","A shape in the night sky with points.")]),
    ("My body", [("HEAD","The top part of your body; your hair is on it."),("HAND","You have five fingers on it."),("FOOT","You stand on it; you wear a shoe on it."),("NOSE","You smell with it."),("MOUTH","You eat and speak with it."),("ARM","It joins your hand to your body."),("LEG","You walk with two of these."),("HAIR","It grows on your head."),("FINGER","There are five of these on one hand."),("TOOTH","It is white and helps you bite food."),("KNEE","It is in the middle of your leg."),("EAR","You hear with it.")]),
    ("Clothes", [("HAT","You wear it on your head."),("SHIRT","You wear it on the top of your body."),("SHOES","You wear them on your feet."),("SOCKS","You wear them on your feet inside shoes."),("DRESS","A girl wears it; it is like a long top."),("COAT","You wear it outside when it is cold."),("SKIRT","A girl wears it; it hangs from the waist."),("JEANS","Blue trousers made of strong cloth."),("SCARF","You wear it around your neck in winter."),("BOOTS","Strong shoes for rain or snow."),("SHORTS","Short trousers for hot days."),("GLOVES","You wear them on your hands when cold.")]),
    ("Weather and seasons", [("SUN","It is hot and bright in the sky."),("RAIN","Water that falls from the clouds."),("SNOW","Soft white pieces that fall when it is cold."),("WIND","Moving air that blows the trees."),("CLOUD","A white or grey shape in the sky."),("COLD","The opposite of hot."),("WINTER","The coldest season, with snow."),("SUMMER","The hottest season."),("SPRING","The season when flowers grow."),("AUTUMN","The season when leaves fall."),("STORM","Bad weather with wind and rain."),("WARM","A little bit hot; not cold.")]),
    ("Jobs", [("DOCTOR","This person helps you when you are ill."),("NURSE","This person helps the doctor and sick people."),("PILOT","This person flies a plane."),("FARMER","This person grows food and keeps animals."),("COOK","This person makes food in a kitchen."),("POLICE","These people keep us safe and catch robbers."),("DRIVER","This person drives a bus or a car."),("ARTIST","This person paints pictures."),("SINGER","This person sings songs."),("DENTIST","This person looks after your teeth."),("BAKER","This person makes bread and cakes."),("WAITER","This person brings food to your table.")]),
    ("Sports and hobbies", [("SWIM","To move through the water."),("RUN","To move fast on your legs."),("JUMP","To push up into the air with your legs."),("DANCE","To move your body to music."),("SING","To make music with your voice."),("TENNIS","A game with a racket and a small ball."),("READING","Looking at books for fun."),("DRAWING","Making pictures with a pencil."),("CHESS","A board game with a king and a queen."),("SKATE","To move on ice or wheels."),("FOOTBALL","A game where you kick a ball into a goal."),("CYCLING","Riding a bike for fun or sport.")]),
]

# ====================================================================
# LOAD + VALIDATE USE OF ENGLISH
# ====================================================================
# ====================================================================
# HIPPO 1 crossword word lists (A2 vocabulary)
# ====================================================================
THEMES_HIPPO1 = [
    ("Travel", [("AIRPORT","Place where planes take off and land."),("PASSPORT","Official book you show to travel to another country."),("SUITCASE","A big bag you pack your clothes in for a trip."),("TICKET","A small paper that lets you get on a plane or train."),("HOTEL","A building where you pay to sleep when you travel."),("JOURNEY","A long trip from one place to another."),("LUGGAGE","All the bags and cases you take on a trip."),("FLIGHT","A journey by plane."),("TOURIST","A person who travels to visit interesting places."),("ABROAD","In or to a foreign country."),("BEACH","A sandy place by the sea."),("CAMERA","You use it to take photos on holiday.")]),
    ("Technology", [("LAPTOP","A small computer you can carry."),("TABLET","A flat computer with a touch screen."),("SCREEN","The flat part of a device where you see pictures."),("KEYBOARD","You press its keys to type letters."),("ROBOT","A machine that can do jobs by itself."),("BATTERY","It stores power so your phone can work."),("INTERNET","The system that connects computers all over the world."),("MESSAGE","A short note you send on a phone."),("CHARGER","You use it to fill your phone with power."),("DOWNLOAD","To copy a file from the internet to your device."),("PASSWORD","A secret word you type to open an account."),("SCANNER","A machine that copies a picture into a computer.")]),
    ("Environment", [("FOREST","A large area full of trees."),("RIVER","Water that flows across the land to the sea."),("MOUNTAIN","A very high hill made of rock."),("POLLUTION","Dirty air, water or land that harms nature."),("RECYCLE","To use paper, glass or plastic again."),("PLANET","Earth is one of these in space."),("NATURE","Plants, animals and the world around us."),("RUBBISH","Things you throw away."),("CLIMATE","The usual weather of a place."),("ENERGY","Power for light, heat and machines."),("OCEAN","A very large sea."),("ISLAND","Land with water all around it.")]),
    ("Health", [("DOCTOR","This person helps you when you are ill."),("HOSPITAL","A building where ill people are looked after."),("MEDICINE","You take it to get better when you are sick."),("FEVER","When your body is too hot because you are ill."),("HEART","It pumps blood inside your chest."),("HEALTHY","Strong and not ill."),("NURSE","This person helps the doctor look after patients."),("DENTIST","This person looks after your teeth."),("EXERCISE","Activity like running that keeps you fit."),("BANDAGE","A long cloth you put on a cut."),("COUGH","A loud noise from your throat when you are ill."),("STOMACH","The part of your body where food goes.")]),
    ("Food", [("RESTAURANT","A place where you pay to eat a meal."),("MENU","The list of food you can order."),("DESSERT","The sweet food you eat at the end of a meal."),("WAITER","This person brings your food to the table."),("DELICIOUS","Tasting very nice."),("BREAKFAST","The first meal of the day."),("VEGETABLE","A carrot or a potato is one of these."),("KITCHEN","The room where you cook food."),("RECIPE","Instructions that tell you how to cook a dish."),("HUNGRY","Feeling that you need to eat."),("CHEF","This person cooks food in a restaurant."),("PLATE","A flat dish you eat your food from.")]),
    ("School", [("LIBRARY","The place where you borrow books."),("TEACHER","This person helps you learn at school."),("HOMEWORK","School work you do at home."),("EXAM","A big test at the end of a term."),("LESSON","A time when a teacher teaches you something."),("SCIENCE","The subject about plants, animals and experiments."),("PROJECT","A big piece of school work over many days."),("SUBJECT","Maths and history are each a ___."),("ANSWER","What you write when there is a question."),("STUDENT","A person who studies at school."),("HISTORY","The subject about the past."),("PENCIL","You write with it and can rub it out.")]),
    ("Hobbies", [("GUITAR","A musical instrument with six strings."),("CINEMA","A place where you go to watch films."),("FOOTBALL","A game where you kick a ball into a goal."),("PAINTING","Making a picture with a brush and colours."),("CHESS","A board game with a king and a queen."),("SWIMMING","Moving through the water for fun or sport."),("DANCING","Moving your body to music."),("HOBBY","Something you enjoy doing in your free time."),("MUSIC","Sounds and songs you listen to."),("COMIC","A book that tells a story with pictures."),("AUDIENCE","The people who watch a show."),("CONCERT","A live show where people play music.")]),
    ("Shopping", [("MARKET","An outdoor place with stalls to buy food."),("MONEY","Coins and notes you use to buy things."),("WALLET","A small case where you keep your money."),("RECEIPT","The paper that shows what you bought."),("CASHIER","This person takes your money at the till."),("EXPENSIVE","Costing a lot of money."),("CUSTOMER","A person who buys things in a shop."),("JACKET","A short coat you wear."),("PRESENT","Something nice you give to someone."),("BARGAIN","Something good that you buy very cheaply."),("PRICE","How much money something costs."),("QUEUE","A line of people waiting their turn.")]),
    ("Jobs", [("PILOT","This person flies a plane."),("ENGINEER","This person designs and builds machines."),("FARMER","This person grows food and keeps animals."),("ARTIST","This person paints pictures."),("SCIENTIST","This person does experiments to learn things."),("FIREMAN","This person puts out fires."),("DENTIST","This person looks after your teeth."),("BUILDER","This person builds houses."),("UNIFORM","Special clothes you wear for a job."),("OFFICE","A room where people work at desks."),("DOCTOR","This person helps ill people."),("CAREER","The job you do for many years.")]),
    ("Daily life", [("BREAKFAST","The first meal of the day."),("ROUTINE","The things you do every day in the same order."),("MORNING","The early part of the day."),("CHORES","Small jobs at home like washing dishes."),("DINNER","The main meal in the evening."),("HOMEWORK","School work you do at home."),("EVENING","The part of the day after the afternoon."),("WEEKEND","Saturday and Sunday."),("SCHEDULE","A plan that shows when you do things."),("EARLY","Before the usual time."),("ALARM","A clock sound that wakes you up."),("TIDY","Neat, with everything in its place.")]),
]

# ====================================================================
# BABY HIPPO crossword word lists (A1 vocabulary, distinct from Little Hippo)
# ====================================================================
THEMES_BABY = [
    ("Toys", [("BALL","A round toy you kick or throw."),("DOLL","A toy that looks like a little person."),("KITE","A toy you fly in the wind."),("ROBOT","A toy machine that can move."),("TEDDY","A soft toy bear."),("DRUM","A toy you hit to make a sound."),("TRAIN","A toy with carriages on a track."),("BOAT","A toy that floats on water."),("PLANE","A toy that flies in the sky."),("BLOCKS","Small bricks you build with."),("PUZZLE","Pieces you fit together to make a picture."),("CAR","A small toy with four wheels.")]),
    ("My house", [("DOOR","You open it to go into a room."),("WINDOW","You look through it to see outside."),("ROOF","The top of a house."),("BED","You sleep in it."),("CHAIR","You sit on it."),("TABLE","You eat at it."),("LAMP","It gives light in a room."),("SOFA","A long soft seat for the family."),("WALL","The side of a room."),("FLOOR","You walk on it inside."),("STAIRS","You go up them to the next floor."),("GARDEN","Green space outside the house.")]),
    ("The park", [("TREE","It is tall with leaves and branches."),("GRASS","Green plants on the ground."),("BENCH","A long seat in the park."),("SLIDE","You go down it fast."),("SWING","You go back and forth on it."),("POND","A small area of water."),("FLOWER","A pretty plant with petals."),("GATE","A small door in a fence."),("PATH","A way to walk on."),("DUCK","A bird that swims on the pond."),("KITE","You fly it in the park."),("BALL","You play with it on the grass.")]),
    ("Transport", [("BUS","A big vehicle that carries many people."),("TRAIN","It runs on tracks."),("BIKE","It has two wheels and pedals."),("PLANE","It flies in the sky."),("BOAT","It goes on water."),("TRUCK","A big vehicle that carries heavy things."),("TAXI","A car you pay to ride in."),("ROAD","Cars drive on it."),("WHEEL","It is round and turns."),("SHIP","A very big boat."),("VAN","A small truck."),("CAR","Most families have one to drive.")]),
    ("On the farm", [("COW","It gives us milk."),("PIG","A pink farm animal."),("HEN","A bird that lays eggs."),("SHEEP","It gives us wool."),("HORSE","A big animal you can ride."),("GOAT","An animal with horns that eats grass."),("BARN","A big building for farm animals."),("FIELD","Open land where animals eat grass."),("FARMER","The person who works on the farm."),("EGG","A hen lays it."),("DUCK","A bird that swims and quacks."),("TRACTOR","A big machine the farmer drives.")]),
    ("In the garden", [("FLOWER","A pretty plant with petals."),("LEAF","It is green and grows on a tree."),("BEE","It buzzes and makes honey."),("SNAIL","A small animal with a shell that moves slowly."),("FROG","A green animal that jumps."),("SEED","You plant it to grow a flower."),("PLANT","It grows in the soil."),("BUSH","A small low plant."),("WORM","A long thin animal in the soil."),("GRASS","Green plants on the ground."),("TREE","It is tall with branches."),("SPADE","You dig the soil with it.")]),
    ("Birthday party", [("CAKE","A sweet food with candles on top."),("CANDLE","You blow it out on the cake."),("BALLOON","You fill it with air and it floats."),("PRESENT","A gift wrapped in paper."),("PARTY","A fun event to celebrate."),("CARD","You write nice words in it."),("HAT","You wear it on your head at the party."),("FRIEND","A person you like and play with."),("GAME","You play it for fun at the party."),("SONG","You sing it to celebrate."),("SWEET","A small sugary treat."),("GIFT","Another word for a present.")]),
    ("Fruit and veg", [("APPLE","A round red or green fruit."),("BANANA","A long yellow fruit."),("ORANGE","A round fruit; also a colour."),("GRAPE","A small round fruit that grows in a bunch."),("PEAR","A green fruit, fat at the bottom."),("CARROT","A long orange vegetable."),("TOMATO","A round red vegetable."),("POTATO","A vegetable that grows under the ground."),("LEMON","A sour yellow fruit."),("PLUM","A small soft purple fruit."),("PEAS","Small green round vegetables."),("CORN","A yellow vegetable with many seeds.")]),
    ("At the zoo", [("LION","The big cat called the king of animals."),("TIGER","A big cat with orange and black stripes."),("ZEBRA","A horse with black and white stripes."),("MONKEY","It climbs trees and loves bananas."),("SNAKE","A long animal with no legs."),("BEAR","A big furry animal."),("PANDA","A black and white bear that eats bamboo."),("SEAL","An animal that swims and claps."),("CAGE","Where some zoo animals are kept."),("PARROT","A colourful bird that can talk."),("CAMEL","A desert animal with a hump."),("FROG","A small green animal that jumps.")]),
    ("The beach", [("SAND","Tiny yellow grains on the beach."),("SHELL","You find it on the sand by the sea."),("BUCKET","You fill it with sand or water."),("SPADE","You dig the sand with it."),("WAVE","Moving water on the sea."),("CRAB","A sea animal with claws."),("BOAT","It floats on the sea."),("SUN","It is hot and bright in the sky."),("TOWEL","You dry yourself with it."),("FISH","It lives in the water and swims."),("ROCK","A hard stone by the sea."),("STAR","A starfish shape on the sand.")]),
]

# ====================================================================
# HIPPO 2 crossword word lists (A2 vocabulary, distinct from Hippo 1)
# ====================================================================
THEMES_HIPPO2 = [
    ("The city", [("STREET","A road in a town with houses and shops."),("BUILDING","A house, shop or office made of bricks."),("BRIDGE","You cross it to get over a river."),("MUSEUM","A place where you see old or famous things."),("STATION","Where you get on a train."),("TRAFFIC","All the cars moving on the roads."),("CORNER","Where two streets meet."),("SQUARE","A big open space in a city centre."),("LIBRARY","A place full of books to borrow."),("MARKET","An outdoor place with stalls."),("CINEMA","A place to watch films."),("PARK","A green space in the city.")]),
    ("Weather", [("STORM","Bad weather with strong wind and rain."),("THUNDER","The loud noise in a storm."),("RAINBOW","Coloured arc in the sky after rain."),("CLOUD","A white or grey shape in the sky."),("SNOW","Soft white flakes that fall when cold."),("FROST","Thin ice on the ground in winter."),("BREEZE","A light, gentle wind."),("SEASON","Spring, summer, autumn or winter."),("WINTER","The coldest season."),("SUMMER","The hottest season."),("AUTUMN","The season when leaves fall."),("FOG","Thick cloud near the ground.")]),
    ("Sport", [("FOOTBALL","A game where you kick a ball into a goal."),("TENNIS","A game with a racket and a small ball."),("MEDAL","You win it when you come first."),("TEAM","A group of players together."),("COACH","The person who trains the team."),("GOAL","You score one to win points in football."),("RACKET","You hit the ball with it in tennis."),("MATCH","A game between two teams."),("WINNER","The person who comes first."),("FIELD","The grass where football is played."),("POOL","Swimmers train in it."),("RACE","A competition to be the fastest.")]),
    ("Films and music", [("CINEMA","A place to watch films on a big screen."),("ACTOR","A person who acts in films."),("SINGER","A person who sings songs."),("GUITAR","An instrument with six strings."),("CONCERT","A live show with music."),("STAGE","Where actors and singers perform."),("MOVIE","Another word for a film."),("ALBUM","A collection of songs."),("SCREEN","The big surface a film is shown on."),("BAND","A group of people who play music."),("DRUMS","You hit them to keep the beat."),("AUDIENCE","The people who watch a show.")]),
    ("Friends and family", [("COUSIN","Your aunt's or uncle's child."),("UNCLE","Your mother's or father's brother."),("AUNT","Your mother's or father's sister."),("NIECE","Your brother's or sister's daughter."),("FRIEND","A person you like and trust."),("PARENT","Your mother or your father."),("BROTHER","A boy with the same parents as you."),("SISTER","A girl with the same parents as you."),("GRANNY","Another word for grandmother."),("FAMILY","Parents and children together."),("BABY","A very young child."),("TWIN","One of two children born together.")]),
    ("Wild animals", [("ELEPHANT","A huge grey animal with a trunk."),("GIRAFFE","A tall animal with a very long neck."),("CHEETAH","The fastest animal on land."),("MONKEY","It climbs trees in the jungle."),("SNAKE","A long animal with no legs."),("LION","A big cat that lives in Africa."),("TIGER","A big cat with stripes."),("BEAR","A big furry animal that can be brown or white."),("WOLF","A wild animal like a big dog."),("FOX","A wild animal with a bushy tail."),("DEER","A gentle animal with antlers."),("JUNGLE","A thick hot forest where wild animals live.")]),
    ("Festivals", [("PARADE","People walking through the streets to celebrate."),("FIREWORK","It explodes with colour in the night sky."),("COSTUME","Special clothes you wear to a party."),("PARTY","A fun event to celebrate."),("CANDLE","You light it and make a wish."),("CARNIVAL","A big street festival with music and dancing."),("MUSIC","Sounds and songs at the festival."),("DANCE","To move your body to music."),("CROWD","A lot of people in one place."),("GIFT","Something nice you give to someone."),("CAKE","A sweet food for a celebration."),("LANTERN","A light you carry or hang up.")]),
    ("The home", [("KITCHEN","The room where you cook."),("BEDROOM","The room where you sleep."),("BATHROOM","The room where you wash."),("GARAGE","Where you keep the car."),("CUPBOARD","A space with shelves and doors for things."),("WARDROBE","Where you hang your clothes."),("CARPET","A soft cover on the floor."),("CURTAIN","Cloth you pull across a window."),("PILLOW","You put your head on it in bed."),("BLANKET","A warm cover for the bed."),("MIRROR","You see yourself in it."),("SHELF","A flat board on a wall for books.")]),
    ("Feelings", [("HAPPY","Feeling good and pleased."),("ANGRY","Feeling cross and upset."),("SCARED","Feeling afraid."),("EXCITED","Feeling very happy about something soon."),("BORED","Feeling there is nothing to do."),("PROUD","Feeling pleased about something you did."),("NERVOUS","Feeling a little afraid before something."),("TIRED","Feeling you need to sleep."),("CALM","Feeling quiet and relaxed."),("BRAVE","Not afraid of danger."),("LONELY","Feeling sad because you are alone."),("KIND","Friendly and caring to others.")]),
    ("A trip", [("JOURNEY","Travelling from one place to another."),("SUITCASE","A big bag for your clothes on a trip."),("TICKET","You need it to get on a train or plane."),("HOTEL","A place where you pay to sleep on a trip."),("CAMERA","You take photos with it."),("MAP","It helps you find the way."),("BEACH","A sandy place by the sea."),("MOUNTAIN","A very high hill of rock."),("SOUVENIR","A small thing you buy to remember a trip."),("PICNIC","A meal you eat outside."),("VIEW","What you can see from a high place."),("CASTLE","A big old stone building with towers.")]),
]

# Each category: name, id offset (Little Hippo MUST stay 0 -> ids 1..10), themes, UoE files.
# Order = build order = random-seed order; Little Hippo + Hippo 1 are built FIRST so their
# grids never change when new categories are appended.
CATEGORIES = [
    {"name": "Little Hippo", "id_base": 0, "themes": THEMES,
     "uoe": ["content/uoe_1_5.json", "content/uoe_6_10.json"]},
    {"name": "Hippo 1", "id_base": 10, "themes": THEMES_HIPPO1,
     "uoe": ["content/hippo1_uoe_1_5.json", "content/hippo1_uoe_6_10.json"]},
    {"name": "Baby Hippo", "id_base": 20, "themes": THEMES_BABY,
     "uoe": ["content/baby_uoe_1_5.json", "content/baby_uoe_6_10.json"]},
    {"name": "Hippo 2", "id_base": 30, "themes": THEMES_HIPPO2,
     "uoe": ["content/hippo2_uoe_1_5.json", "content/hippo2_uoe_6_10.json"]},
]


def load_uoe(files):
    tests = []
    for fn in files:
        with open(os.path.join(HERE, fn), encoding="utf-8") as f:
            tests += json.load(f)
    assert len(tests) == 10, f"{files}: expected 10 UoE tests, got {len(tests)}"
    for ti, t in enumerate(tests, 1):
        assert len(t) == 30, f"{files} test {ti} has {len(t)} items (need 30)"
        for qi, item in enumerate(t, 1):
            assert item["q"].count("____") == 1, f"{files} test {ti} q{qi} blank count != 1: {item['q']!r}"
            ans = item.get("answers")
            assert isinstance(ans, list) and ans and all(isinstance(x, str) and x.strip() for x in ans), \
                f"{files} test {ti} q{qi} bad answers: {ans!r}"
            item["answers"] = [x.strip().lower() for x in ans]
    return tests


# ====================================================================
# BUILD  (Little Hippo built FIRST + same seed order => grids unchanged)
# ====================================================================
def main():
    exams = []
    for cat in CATEGORIES:
        uoe = load_uoe(cat["uoe"])
        for i, (theme, words) in enumerate(cat["themes"]):
            cw = build_crossword(theme, words)
            num = i + 1
            eid = cat["id_base"] + num
            nwords = len(cw["across"]) + len(cw["down"])
            print(f"[{cat['name']:12s}] Exam {eid:2d} (#{num:2d}) | {theme:14s} | "
                  f"cw {cw['rows']}x{cw['cols']} {nwords}w | UoE {len(uoe[i])}Q")
            exams.append({"id": eid, "num": num, "category": cat["name"],
                          "batch": 1, "crossword": cw, "uoe": uoe[i]})

    payload = {"config": CONFIG, "exams": exams}
    # Written to api/_lib/ so it ships ONLY inside the serverless functions
    # (underscore-prefixed = not a route, not statically served). Answers never
    # reach the browser; the client gets stripped content via /api/exam.
    out_dir = os.path.join(HERE, "api", "_lib")
    os.makedirs(out_dir, exist_ok=True)
    out = json.dumps(payload, ensure_ascii=False)
    with open(os.path.join(out_dir, "exams.json"), "w", encoding="utf-8") as f:
        f.write(out)
    print(f"\nWROTE api/_lib/exams.json  ({len(out) / 1024:.0f} KB, {len(exams)} exams)")


if __name__ == "__main__":
    main()
