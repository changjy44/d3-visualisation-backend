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
          // const year = Number(req.body.year);
          // console.log(year);
          const query = req.body.query;
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
          // console.log(data.records[0]._fields);

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

            playerNodes = playerNodes.filter((entry, index) => {
              for (let i = 0; i < index; i++) {
                if (playerNodes[i].id === playerNodes[index].id) {
                  return false;
                }
              }
              return true;
            });

            clubArray.push(targetPlayer);
            clubArray = clubArray.concat(playerNodes);

            // nodesArray.push(targetClub);

            // const targetPlayerLink = {
            //   source: data.records[0]._fields[0].properties.Name,
            //   target: data.records[0]._fields[2].properties.clubName,
            //   value: 1,
            // };
            let finalNodes = [];
            let finalPlayerLinks = [];

            function getLabelOrRelation(columnEntry) {
              if (columnEntry.labels) {
                return columnEntry.labels[0];
              } else {
                return columnEntry.type;
              }
            }

            function filterNodes(nodesArray) {
              nodesArray = nodesArray.filter((entry, index) => {
                for (let i = 0; i < index; i++) {
                  if (nodesArray[i].id === nodesArray[index].id) {
                    return false;
                  }
                }
                return true;
              });
              return nodesArray;
            }

            function filterLinks(linksArray) {
              linksArray = linksArray.filter((entry, index) => {
                for (let i = 0; i < index; i++) {
                  if (
                    linksArray[i].source === linksArray[index].source &&
                    linksArray[i].target === linksArray[index].target &&
                    linksArray[i].startYear === linksArray[index].startYear
                  ) {
                    return false;
                  }
                }
                return true;
              });
              return linksArray;
            }

            function editInstanceNumber(linksArray) {
              linksArray.forEach((entry, index) => {
                for (let i = 0; i < index; i++) {
                  if (linksArray[i].source === linksArray[index].source) {
                    if (linksArray[i].target === linksArray[index].target) {
                      entry.unique++;
                      // linksArray[i].unique = false;
                    }

                    entry.instanceNumber++;
                  }
                }
              });
              return linksArray;
            }

            for (let i = 0; i < data.records.length; i++) {
              const rowEntry = data.records[i]._fields;
              for (let j = 0; j < rowEntry.length; j++) {
                const columnEntry = rowEntry[j];
                const label = getLabelOrRelation(columnEntry);
                if (label === "WORKED_AT") {
                  const json = {
                    source: columnEntry.properties.Name,
                    target: columnEntry.properties.clubName,
                    value: 1,
                    startYear: columnEntry.properties.start.low,
                    instanceNumber: 1,
                    unique: 1,
                  };
                  finalPlayerLinks.push(json);
                } else if (label === "Player") {
                  if (j === 0) {
                    const json = {
                      id: columnEntry.properties.Name,
                      group: 1,
                      label: label,
                    };
                    finalNodes.push(json);
                  } else {
                    const json = {
                      id: columnEntry.properties.Name,
                      group: 3,
                      label: label,
                    };
                    finalNodes.push(json);
                  }
                } else {
                  const json = {
                    id: columnEntry.properties.clubName,
                    group: 2,
                    label: label,
                  };
                  finalNodes.push(json);
                }
              }
            }

            finalNodes = filterNodes(finalNodes);
            finalPlayerLinks = filterLinks(finalPlayerLinks);
            // console.log(finalPlayerLinks[99]);
            finalPlayerLinks = finalPlayerLinks.sort((a, b) => {
              return a.startYear > b.startYear ? -1 : 1;
            });
            // console.log(finalPlayerLinks.map((data) => data.startYear));
            finalPlayerLinks = editInstanceNumber(finalPlayerLinks);
            // console.log(finalPlayerLinks);
            /*
            let targetPlayerLinks = data.records.map((entry) => {
              const json = {
                source: entry._fields[0].properties.Name,
                target: entry._fields[2].properties.clubName,
                value: 1,
                startYear: entry._fields[1].properties.start.low,
                instanceNumber: 1,
                unique: true,
              };
              return json;
            });

            targetPlayerLinks = targetPlayerLinks.filter((entry, index) => {
              for (let i = 0; i < index; i++) {
                if (
                  targetPlayerLinks[i].target ===
                    targetPlayerLinks[index].target &&
                  targetPlayerLinks[i].startYear ===
                    targetPlayerLinks[index].startYear
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
                startYear: entry._fields[3].properties.start.low,
                instanceNumber: 1,
                unique: true,
              };
              return json;
            });

            secondLinksArray = secondLinksArray.filter((entry, index) => {
              for (let i = 0; i < index; i++) {
                if (
                  secondLinksArray[i].source === secondLinksArray[index].source
                ) {
                  return false;
                }
              }
              return true;
            });

            // console.log(secondLinksArray);

            secondLinksArray = secondLinksArray.concat(targetPlayerLinks);

            secondLinksArray.sort((a, b) => {
              a.props > b.props ? -1 : 1;
            });

            secondLinksArray.forEach((entry, index) => {
              for (let i = 0; i < index; i++) {
                if (
                  secondLinksArray[i].source ===
                    secondLinksArray[index].source &&
                  secondLinksArray[i].target === secondLinksArray[index].target
                ) {
                  entry.instanceNumber++;
                  entry.unique = false;
                  secondLinksArray[i].unique = false;
                }
              }
            });

            
            secondLinksArray = secondLinksArray.filter((entry) => {
              if (!entry.unique) {
                nonUniqueLinksArray.push(entry);
                return false;
              } else {
                return true;
              }
            });*/

            // console.log(secondLinksArray.length);

            // secondLinksArray.push(targetPlayerLink);
            // console.log(clubArray);
            var json = {
              // nodes: [],
              nodes: finalNodes,

              links: finalPlayerLinks,
              // nonUniqueLinks: nonUniqueLinksArray,
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
