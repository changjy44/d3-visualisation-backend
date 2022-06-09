const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();
const neo4j = require("neo4j-driver");
const uri = "neo4j://13.213.80.230:7687";
const user = "neo4j";
const password = "8H2er2re6e";
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// var json = require("./force.json");

app.use("/api", (req, res) => {
  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  const session = driver.session();
  try {
    console.log("working!");
    async function getAllNodes() {
      console.log(req.body.name);
      const result = await session
        .readTransaction((tx) => {
          // return tx.run("MATCH (p {name:'Shaun Wright-Phillips'}) RETURN p;");
          const year = Number(req.body.year);
          console.log(year);
          const query =
            /*
            "MATCH(p1:Player) -[r1:WORKED_AT] -> (c:Club) <-[r2:WORKED_AT]- (p2:Player)" +
            `WHERE (p1.Name ='${decodeURI(
              req.body.name
            )}')  AND (r1.start<=${year}) AND (r1.end >=${year}) AND (r2.start <=${year}) AND (r2.end >=${year})` +
            "RETURN p1,r1,c,r2,p2";*/

            // "MATCH (p {Name: 'Thiago Neves'}) -[r:WORKED_AT]->(c:Club) RETURN p,r,c";
            "MATCH(p1:Player) -[r1:WORKED_AT] -> (c:Club) <-[r2:WORKED_AT]- (p2:Player) WHERE (p1.Name ='Thiago Neves') AND (r1.start <= 2015) AND (r2.start <= 2015) RETURN p1,r1,c,r2,p2";
          return tx.run(query);
        })
        .then((data) => {
          //   console.log(data.records[0]);
          //   console.log(data.records);
          // console.log(data.records[0]._fields[0].properties.Name);
          // console.log(data.records[0]._fields[0].labels[0]); --> For player labels
          // console.log(
          //   data.records.map((entry) => {
          //     return entry._fields[1];
          //   })
          // );
          if (data.records.length > 0) {
            const targetPlayer = {
              id: data.records[0]._fields[0].properties.Name,
              group: 1,
              label: data.records[0]._fields[0].labels[0],
            };

            let clubArray = data.records.map((entry) => {
              const json = {
                id: entry._fields[2].properties.clubName,
                group: 3,
                label: entry._fields[0].labels[0],
              };
              return json;
            });

            clubArray = clubArray.filter((entry, index) => {
              for (let i = 0; i < index; i++) {
                if (clubArray[i].id === clubArray[index].id) {
                  return false;
                }
              }
              return true;
            });

            let playerNodes = data.records.map((entry) => {
              const json = {
                id: entry._fields[4].properties.Name,
                group: 2,
                label: entry._fields[0].labels[0],
              };
              return json;
            });

            clubArray.push(targetPlayer);
            clubArray = clubArray.concat(playerNodes);

            // nodesArray.push(targetClub);

            // const targetPlayerLink = {
            //   source: data.records[0]._fields[0].properties.Name,
            //   target: data.records[0]._fields[2].properties.clubName,
            //   value: 1,
            // };

            let targetPlayerLinks = data.records.map((entry) => {
              const json = {
                source: entry._fields[0].properties.Name,
                target: entry._fields[2].properties.clubName,
                value: 1,
                props: entry._fields[1].properties.start.low,
                instance: 1,
              };
              return json;
            });

            targetPlayerLinks = targetPlayerLinks.filter((entry, index) => {
              for (let i = 0; i < index; i++) {
                if (
                  targetPlayerLinks[i].target ===
                  targetPlayerLinks[index].target
                ) {
                  return false;
                }
              }
              return true;
            });

            let secondLinksArray = data.records.map((entry) => {
              const json = {
                source: entry._fields[4].properties.Name,
                target: entry._fields[2].properties.clubName,
                value: 1,
                props: entry._fields[3].properties.start.low,
                instance: 1,
              };
              return json;
            });

            console.log(secondLinksArray);

            secondLinksArray = secondLinksArray.concat(targetPlayerLinks);

            secondLinksArray.sort((a, b) => {
              a.props > b.props ? -1 : 1;
            });

            secondLinksArray.forEach((entry, index) => {
              for (let i = 0; i < index; i++) {
                if (
                  secondLinksArray[i].source === secondLinksArray[index].source
                ) {
                  entry.instance++;
                }
              }
            });

            // console.log(secondLinksArray);

            // secondLinksArray.push(targetPlayerLink);

            var json = {
              // nodes: [],
              nodes: clubArray,

              links: secondLinksArray,
            };

            res.end(JSON.stringify(json));
            return data;
          }
        });
      //   console.log(result);
      session.close();
      driver.close();
    }
    getAllNodes();

    //   const singleRecord = result.records[0];
    //   const node = singleRecord.get(0);
    //   console.log(node.properties.name);
    // } finally {
    //   session.close();
  } catch (e) {
    console.log(e);
  }

  //   console.log(req.body);
});

app.listen(8000, () => {
  console.log("Server started on port 8000...");
});
